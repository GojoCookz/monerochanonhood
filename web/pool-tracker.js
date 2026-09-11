// Presentation adapter for the LP reserve; never mutates the source snapshot.
// The internal address is a wheel/journal identifier, not an EVM wallet.
// The public API instead exposes poolId with address:null and raw:null.
// An LP has no standalone ERC-20 holder address: this is an approximate
// comparison of reported pool XMR against the filtered address list.
export function poolTracker(snapshot){
  if(!snapshot)return null
  const market=snapshot.project?.market
  const balance=market?.lpXmr
  const known=typeof balance==='number'&&Number.isFinite(balance)&&balance>=0
  const index=snapshot.index??[]
  const above=known?index.filter(([, , amount])=>amount>balance):[]
  const rank=known&&index.length?above.length+1:null
  const next=above.at(-1)
  const rung=row=>{
    if(!row||!known)return null
    const need=Math.max(0,row[2]-balance)
    return {rank:row[1],holderAddress:row[0],holderXmr:row[2],needXmr:need,
      needUsd:snapshot.price?.usd!=null?need*snapshot.price.usd:null,reached:need===0}
  }
  return {...snapshot,takenAt:market?.checkedAt??snapshot.takenAt,
    reserve:{kind:'pool',deployed:Boolean(snapshot.project?.pool),address:snapshot.project?.pool??null,
      rank,xmr:known?balance:null,raw:known?balance.toFixed(12):null,delta:null},
    nextRung:rung(next),ladder:[1,3,5,10].map(n=>rung(index.find(([,r])=>r===n))).filter(Boolean)}
}
