import { toEventSelector } from 'viem'
import { readRpc } from './rpc.mjs'
import { POOL_EVENTS,poolVolume } from './project-math.mjs'

const swapTopic=toEventSelector(POOL_EVENTS.find(item=>item.name==='Swap'))
const hex=n=>'0x'+n.toString(16)

export async function readPoolVolume({manager,pool,pairIsCurrency0,launchBlock,throughBlock,blockHash,previous,rpc=readRpc}){
  let from=BigInt(launchBlock),base=0n,count=0
  if(previous?.complete&&previous.pool===pool&&previous.fromBlock===String(launchBlock)
    &&BigInt(previous.throughBlock)<=throughBlock){
    const old=await rpc('eth_getBlockByNumber',[hex(BigInt(previous.throughBlock)),false])
    if(old?.hash===previous.blockHash){
      from=BigInt(previous.throughBlock)+1n
      base=BigInt(previous.raw)
      count=previous.swapCount
    }
  }
  const started=Date.now()
  let calls=0
  async function scan(lo,hi){
    if(lo>hi)return []
    if(++calls>40||Date.now()-started>45000)throw new Error('Volume indexing budget exceeded')
    let logs
    try{
      logs=await rpc('eth_getLogs',[{address:manager,fromBlock:hex(lo),toBlock:hex(hi),topics:[swapTopic,pool]}])
      if(!Array.isArray(logs))throw new Error('Invalid swap response')
      // Split dense responses defensively rather than trusting a provider cap.
      if(logs.length<200)return logs
    }catch(error){
      if(!/range|limit|too many|more than/i.test(error.message))throw error
    }
    if(lo===hi)throw new Error('Cannot establish complete single-block swap response')
    const middle=(lo+hi)/2n
    return [...await scan(lo,middle),...await scan(middle+1n,hi)]
  }
  const logs=await scan(from,throughBlock)
  const volume=poolVolume(logs,{manager,pool,pairIsCurrency0})
  const end=await rpc('eth_getBlockByNumber',[hex(throughBlock),false])
  if(end?.hash!==blockHash)throw new Error('Chain changed during volume read')
  return {pool,complete:true,fromBlock:String(launchBlock),throughBlock:String(throughBlock),blockHash,
    raw:String(base+volume.raw),swapCount:count+volume.count,checkedAt:new Date().toISOString(),
    source:'Absolute XMR leg of canonical PoolManager Swap events since pool creation; pool turnover, excluding separate hook fees'}
}
