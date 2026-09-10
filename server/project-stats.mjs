import { decodeEventLog } from 'viem'
import { TOKEN_ADDRESS,TOKEN_POOL_ID,TOKEN_LAUNCH_TX } from '../web/token-config.js'
import { XMR,POOL_MANAGER,DEXSCREENER } from './config.mjs'
import { getJson } from './http.mjs'
import { readRpc,readFunction } from './rpc.mjs'
import { POOL_EVENTS,selectMarket } from './project-math.mjs'
import { readPoolVolume } from './project-volume.mjs'

let launchPromise=null
async function launchEvidence(){
  if(!launchPromise)launchPromise=(async()=>{
    if(BigInt(await readRpc('eth_chainId'))!==4663n)throw new Error('Wrong RPC chain')
    const receipt=await readRpc('eth_getTransactionReceipt',[TOKEN_LAUNCH_TX])
    if(receipt?.status!=='0x1')throw new Error('Launch receipt unavailable')
    for(const log of receipt.logs){
      if(log.address.toLowerCase()!==POOL_MANAGER.toLowerCase())continue
      try{
        const decoded=decodeEventLog({abi:POOL_EVENTS,eventName:'Initialize',topics:log.topics,data:log.data})
        if(decoded.args.id.toLowerCase()!==TOKEN_POOL_ID)continue
        const currencies=[decoded.args.currency0.toLowerCase(),decoded.args.currency1.toLowerCase()]
        if(!currencies.includes(TOKEN_ADDRESS.toLowerCase())||!currencies.includes(XMR.toLowerCase()))throw new Error('Unexpected pool currencies')
        return {...decoded.args,launchBlock:BigInt(receipt.blockNumber)}
      }catch(error){if(error.message==='Unexpected pool currencies')throw error}
    }
    throw new Error('Expected pool not present in launch receipt')
  })().catch(error=>{launchPromise=null;throw error})
  return launchPromise
}

async function chainStats(previous){
  const launch=await launchEvidence()
  const block=await readRpc('eth_blockNumber')
  const header=await readRpc('eth_getBlockByNumber',[block,false])
  if(!header?.hash)throw new Error('Block header unavailable')
  const read=(address,sig,args=[])=>readFunction(address,sig,args,block)
  const distributor=await read(TOKEN_ADDRESS,'function distributor() view returns (address)')
  const [share,pair,reward,converter,controller,withdrawn,credited,shares,supply,decimals,xmrDecimals,streamSeconds]=await Promise.all([
    read(distributor,'function shareToken() view returns (address)'),
    read(distributor,'function payoutToken() view returns (address)'),
    read(distributor,'function rewardToken() view returns (address)'),
    read(distributor,'function converter() view returns (address)'),
    read(distributor,'function controller() view returns (address)'),
    read(distributor,'function totalWithdrawn() view returns (uint256)'),
    read(distributor,'function totalDistributed() view returns (uint256)'),
    read(distributor,'function totalShares() view returns (uint256)'),
    read(TOKEN_ADDRESS,'function totalSupply() view returns (uint256)'),
    read(TOKEN_ADDRESS,'function decimals() view returns (uint8)'),
    read(XMR,'function decimals() view returns (uint8)'),
    read(distributor,'function STREAM_WINDOW() view returns (uint64)'),
  ])
  if(share.toLowerCase()!==TOKEN_ADDRESS.toLowerCase()||pair.toLowerCase()!==XMR.toLowerCase()
    ||controller.toLowerCase()!==launch.hooks.toLowerCase())throw new Error('Distributor wiring mismatch')
  const [cfg,split]=await Promise.all([
    read(controller,'function poolConfig(bytes32) view returns (address,address,uint16,address,uint16,bool,uint16,uint16,uint16)',[TOKEN_POOL_ID]),
    read(controller,'function effectiveSplitBps(bytes32) view returns (uint16,uint16,uint16)',[TOKEN_POOL_ID]),
  ])
  if(cfg[0].toLowerCase()!==distributor.toLowerCase()||cfg[1].toLowerCase()!==XMR.toLowerCase()||!cfg[5])throw new Error('Fee configuration mismatch')
  const paidInXmr=reward.toLowerCase()===XMR.toLowerCase()&&converter==='0x0000000000000000000000000000000000000000'
  let volume=null
  try{
    volume=await readPoolVolume({manager:POOL_MANAGER,pool:TOKEN_POOL_ID,pairIsCurrency0:launch.currency0.toLowerCase()===XMR.toLowerCase(),
      launchBlock:launch.launchBlock,throughBlock:BigInt(block),blockHash:header.hash,previous:previous?.volume})
  }catch(error){console.error('[project] complete volume unavailable:',error.message)}
  return {onchain:{blockNumber:String(BigInt(block)),blockHash:header.hash,checkedAt:new Date().toISOString(),distributor,
    payoutToken:pair,rewardToken:reward,converter,paidXmrRaw:paidInXmr?String(withdrawn):null,creditedRaw:String(credited),
    eligibleSupplyRaw:String(shares),totalSupplyRaw:String(supply),tokenDecimals:Number(decimals),xmrDecimals:Number(xmrDecimals),streamSeconds:Number(streamSeconds),
    normalBuyFeeBps:cfg[2],normalSellFeeBps:cfg[6],burnShareBps:cfg[7],creatorRecipient:cfg[3],
    platformShareBps:split[0],creatorShareBps:split[1],holderShareBps:split[2],
    holderAllocationPct:(cfg[2]/100)*(split[2]/10000),
    source:'Pinned-block eth_call: token.distributor, distributor.totalWithdrawn/totalDistributed and hook.poolConfig/effectiveSplitBps'},volume}
}

export async function fetchProjectStats(previous=null){
  const previousForToken=previous?.address?.toLowerCase()===TOKEN_ADDRESS.toLowerCase()?previous:null
  const [market,chain]=await Promise.allSettled([
    getJson(`${DEXSCREENER}/tokens/${TOKEN_ADDRESS}`),chainStats(previousForToken),
  ])
  if(chain.status==='rejected')console.error('[project] contract read unavailable:',chain.reason.message)
  return {address:TOKEN_ADDRESS,pool:TOKEN_POOL_ID,launchTx:TOKEN_LAUNCH_TX,
    market:market.status==='fulfilled'?selectMarket(market.value,TOKEN_ADDRESS,TOKEN_POOL_ID):previousForToken?.market??null,
    onchain:chain.status==='fulfilled'?chain.value.onchain:previousForToken?.onchain??null,
    volume:chain.status==='fulfilled'?chain.value.volume:previousForToken?.volume??null,
    contractReadFailed:chain.status==='rejected'}
}
