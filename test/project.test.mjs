import { test } from 'node:test'
import assert from 'node:assert/strict'
import { encodeAbiParameters, encodeEventTopics, parseAbi, parseAbiParameters } from 'viem'
import { poolVolume, selectMarket, POOL_EVENTS } from '../server/project-math.mjs'
import { readPoolVolume } from '../server/project-volume.mjs'
import { readRpc } from '../server/rpc.mjs'
import { xmrFromRaw } from '../server/amounts.mjs'
import { formatUsd } from '../web/format.js'

test('small reserve gaps retain precision before USD conversion',()=>{
  const gap=xmrFromRaw('579828907599117')
  assert.equal(gap,0.000579828907599117)
  assert.equal(formatUsd(gap*498.8),'$0.29')
  assert.equal(formatUsd(0.0004),'<$0.01')
  assert.equal(formatUsd(0),'$0.00')
})

const manager='0x0000000000000000000000000000000000000001'
const pool='0x'+'01'.repeat(32)
function swap(a,b,index=0){
  return {address:manager,transactionHash:'0x'+'ab'.repeat(32),logIndex:'0x'+index.toString(16),removed:false,
    topics:encodeEventTopics({abi:POOL_EVENTS,eventName:'Swap',args:{id:pool,sender:manager}}),
    data:encodeAbiParameters(parseAbiParameters('int128,int128,uint160,uint128,int24,uint24'),[a,b,1n,1n,0,0])}
}
test('pool volume counts one pair leg, both directions, without duplicate logs',()=>{
  const a=swap(-10n,20n),b=swap(5n,-12n,1)
  assert.equal(poolVolume([a,a,b],{manager,pool,pairIsCurrency0:true}).raw,15n)
  assert.equal(poolVolume([a,b],{manager,pool,pairIsCurrency0:false}).raw,32n)
})
test('wrong pool and removed logs cannot inflate volume',()=>{
  const wrong=swap(100n,-10n)
  wrong.address='0x0000000000000000000000000000000000000002'
  assert.throws(()=>poolVolume([wrong],{manager,pool,pairIsCurrency0:true}),/Unexpected/)
  const removed={...swap(1n,-1n),removed:true}
  assert.throws(()=>poolVolume([removed],{manager,pool,pairIsCurrency0:true}),/Removed/)
})
test('market selection pins chain, token and pool; missing volume stays null',()=>{
  const token='0x0000000000000000000000000000000000000003'
  const valid={chainId:'robinhood',pairAddress:pool,baseToken:{address:token},priceUsd:'0.01'}
  assert.equal(selectMarket({pairs:[{...valid,chainId:'ethereum'},valid]},token,pool).volume24hUsd,null)
  assert.equal(selectMarket({pairs:[{...valid,volume:{h24:0}}]},token,pool).volume24hUsd,0)
  assert.equal(selectMarket({pairs:[{...valid,chainId:'ethereum'}]},token,pool),null)
})

test('dense provider responses are split rather than reported as a truncated total',async()=>{
  const logs=Array.from({length:300},(_,i)=>({...swap(1n,-2n,i),blockNumber:'0x'+(1+Math.floor(i/3)).toString(16)}))
  const rpc=async(method,params)=>method==='eth_getBlockByNumber'?{hash:'test-block-hash'}:
    logs.filter(log=>BigInt(log.blockNumber)>=BigInt(params[0].fromBlock)&&BigInt(log.blockNumber)<=BigInt(params[0].toBlock)).slice(0,200)
  const volume=await readPoolVolume({manager,pool,pairIsCurrency0:true,launchBlock:1n,throughBlock:100n,blockHash:'test-block-hash',rpc})
  assert.equal(volume.raw,'300')
  assert.equal(volume.swapCount,300)
  assert.equal(volume.complete,true)
})

test('chain reorganization invalidates the previous volume cursor',async()=>{
  let requestedStart
  const rpc=async(method,params)=>{
    if(method==='eth_getBlockByNumber')return {hash:'new-block-hash'}
    requestedStart=params[0].fromBlock
    return [swap(5n,-10n)]
  }
  const volume=await readPoolVolume({manager,pool,pairIsCurrency0:true,launchBlock:1n,throughBlock:100n,blockHash:'new-block-hash',rpc,
    previous:{pool,complete:true,fromBlock:'1',throughBlock:'50',blockHash:'old-block-hash',raw:'999',swapCount:999}})
  assert.equal(requestedStart,'0x1')
  assert.equal(volume.raw,'5')
})

test('RPC helper refuses transaction submission',async()=>{
  await assert.rejects(readRpc('eth_sendRawTransaction',[]),/Only read-only/)
})
