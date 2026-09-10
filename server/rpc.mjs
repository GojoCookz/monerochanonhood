import { encodeFunctionData, decodeFunctionResult, parseAbi } from 'viem'

export const RPC_URL='https://rpc.mainnet.chain.robinhood.com'
const allowed=new Set(['eth_chainId','eth_blockNumber','eth_call','eth_getCode','eth_getLogs','eth_getTransactionReceipt','eth_getBlockByNumber'])
let id=0
export async function readRpc(method,params=[]){
  if(!allowed.has(method))throw new Error('Only read-only RPC methods are supported')
  const response=await fetch(RPC_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:++id,method,params}),signal:AbortSignal.timeout(20000)})
  if(!response.ok)throw new Error('RPC HTTP '+response.status)
  const json=await response.json()
  if(json.error)throw new Error(`${method}: ${json.error.message}`)
  if(!Object.hasOwn(json,'result'))throw new Error('Missing RPC result')
  return json.result
}

export async function readFunction(address,signature,args=[],block='latest'){
  const abi=parseAbi([signature])
  const fn=abi[0]
  if(fn.type!=='function'||!['view','pure'].includes(fn.stateMutability))throw new Error('Only view functions are supported')
  const data=encodeFunctionData({abi,functionName:fn.name,args})
  const result=await readRpc('eth_call',[{to:address,data},block])
  return decodeFunctionResult({abi,functionName:fn.name,data:result})
}
