import { decodeEventLog, parseAbi } from 'viem'

// Signatures checked against installed v4-core IPoolManager.sol.
export const POOL_EVENTS=parseAbi([
  'event Initialize(bytes32 indexed id,address indexed currency0,address indexed currency1,uint24 fee,int24 tickSpacing,address hooks,uint160 sqrtPriceX96,int24 tick)',
  'event Swap(bytes32 indexed id,address indexed sender,int128 amount0,int128 amount1,uint160 sqrtPriceX96,uint128 liquidity,int24 tick,uint24 fee)',
])

export function poolVolume(logs,{manager,pool,pairIsCurrency0}){
  const seen=new Map()
  let raw=0n
  for(const log of logs){
    if(log.removed)throw new Error('Removed log in volume response')
    if(log.address.toLowerCase()!==manager.toLowerCase())throw new Error('Unexpected pool manager')
    const event=decodeEventLog({abi:POOL_EVENTS,eventName:'Swap',topics:log.topics,data:log.data})
    if(event.args.id.toLowerCase()!==pool.toLowerCase())throw new Error('Unexpected pool ID')
    const key=log.transactionHash+':'+log.logIndex
    if(seen.has(key)){
      if(seen.get(key)!==log.data)throw new Error('Conflicting duplicate swap')
      continue
    }
    seen.set(key,log.data)
    const leg=pairIsCurrency0?event.args.amount0:event.args.amount1
    raw+=leg<0n?-leg:leg
  }
  return {raw,count:seen.size}
}

const finite=value=>(typeof value==='number'||typeof value==='string'&&value.trim()!=='')&&Number.isFinite(Number(value))&&Number(value)>=0?Number(value):null
export function selectMarket(payload,token,pool){
  const item=payload?.pairs?.find(pair=>pair.chainId==='robinhood'
    &&pair.pairAddress?.toLowerCase()===pool.toLowerCase()
    &&pair.baseToken?.address?.toLowerCase()===token.toLowerCase())
  if(!item)return null
  return {priceUsd:finite(item.priceUsd),volume24hUsd:finite(item.volume?.h24),liquidityUsd:finite(item.liquidity?.usd),
    checkedAt:new Date().toISOString(),source:'DexScreener canonical pool, rolling 24h'}
}
