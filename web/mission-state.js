const checkpoints = [
  { label: 'Listed', maxRank: Infinity },
  { label: 'Top 10', maxRank: 10 },
  { label: 'Top 3', maxRank: 3 },
  { label: '#1', maxRank: 1 },
]
export function missionProgress(snapshot) {
  const reserve=snapshot?.reserve ?? {}
  const rank=Number.isInteger(reserve.rank)&&reserve.rank>0 ? reserve.rank : null
  const known=Number.isFinite(reserve.xmr)&&reserve.xmr>=0
  const stages=checkpoints.map(stage=>({label:stage.label,reached:rank!==null&&rank<=stage.maxRank}))
  const completed=stages.filter(stage=>stage.reached).length
  const next=!known ? 'Waiting for a reserve reading'
    : rank===null ? 'Get on the holder board'
    : rank>10 ? 'Reach the top 10'
    : rank>3 ? 'Reach the top 3'
    : rank>1 ? 'Reach the top spot' : 'Leading this snapshot'
  return {
    rankLabel:rank===null?'Unranked':'#'+rank,
    balanceLabel:known?reserve.xmr.toFixed(4)+' XMR':'Unavailable',
    next,completed,stages,
  }
}

function valid(entry) {
  return entry && /^0x[\da-f]{40}$/i.test(entry.address) && Number.isFinite(Date.parse(entry.at))
    && Number.isFinite(entry.xmr) && entry.xmr>=0
    && (entry.rank===null || Number.isInteger(entry.rank)&&entry.rank>0)
    && typeof entry.raw==='string' && /^\d+$/.test(entry.raw)
}

// This is a device-local observation journal, never a global event history.
export function updateJournal(saved,snapshot) {
  const reserve=snapshot?.reserve
  const current={address:reserve?.address?.toLowerCase(),at:snapshot?.takenAt,
    rank:reserve?.rank??null,xmr:reserve?.xmr,raw:reserve?.raw}
  if(!valid(current))return Array.isArray(saved)?saved.filter(valid).slice(-20):[]
  const entries=(Array.isArray(saved)?saved:[]).filter(valid).filter(e=>e.address.toLowerCase()===current.address).slice(-20)
  const last=entries.at(-1)
  if(last && (Date.parse(current.at)<=Date.parse(last.at) || last.raw===current.raw&&last.rank===current.rank))return entries
  return [...entries,current].slice(-20)
}
