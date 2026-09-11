import { test } from 'node:test'
import assert from 'node:assert/strict'
import { missionProgress, updateJournal } from '../web/mission-state.js'
import { poolTracker } from '../web/pool-tracker.js'

const address='0x25D58Dcf6510F5D91a7De0f5246d6D9E74CD8fb1'
function sample(rank, xmr=0, at='2026-09-10T12:00:00Z') {
  return { takenAt:at, reserve:{address,rank,xmr,raw:String(BigInt(Math.round(xmr*1000))*10n**15n)} }
}
test('zero reserve begins at the first checkpoint, not a fabricated rank',()=>{
  const progress=missionProgress(sample(null))
  assert.equal(progress.completed,0)
  assert.equal(progress.next,'Get on the holder board')
  assert.equal(progress.rankLabel,'Unranked')
})
test('milestones follow actual rank in both directions',()=>{
  assert.equal(missionProgress(sample(8,1)).completed,2)
  assert.equal(missionProgress(sample(3,2)).completed,3)
  assert.equal(missionProgress(sample(1,10)).completed,4)
  assert.equal(missionProgress(sample(15,1)).completed,1)
})
test('unknown reserve balance remains unavailable',()=>{
  const progress=missionProgress({reserve:{address,rank:null,xmr:null}})
  assert.equal(progress.balanceLabel,'Unavailable')
  assert.equal(progress.next,'Waiting for a reserve reading')
})
test('journal records only changed observed states and rejects older readings',()=>{
  const first=updateJournal([],sample(null))
  assert.equal(first.length,1)
  assert.equal(updateJournal(first,sample(null,0,'2026-09-10T12:01:00Z')).length,1)
  const changed=updateJournal(first,sample(8,1,'2026-09-10T12:02:00Z'))
  assert.equal(changed.length,2)
  assert.deepEqual(updateJournal(changed,sample(null)),changed)
})
test('a different reserve does not inherit old observations',()=>{
  const old=updateJournal([],sample(1,10))
  const next=sample(null,0,'2026-09-10T12:03:00Z')
  next.reserve.address='0x0000000000000000000000000000000000000001'
  assert.equal(updateJournal(old,next).length,1)
})

test('LP comparison uses pool liquidity without changing the reserve wallet',()=>{
  const source=sample(3,.028)
  source.project={pool:'0x'+'aa'.repeat(32),market:{lpXmr:6.3597,checkedAt:source.takenAt}}
  source.index=[['a',1,14],['b',2,2.9],[address,3,.028]]
  source.price={usd:500}
  const tracked=poolTracker(source)
  assert.equal(tracked.reserve.rank,2)
  assert.equal(tracked.reserve.kind,'pool')
  assert.equal(missionProgress(tracked).rankLabel,'≈#2')
  assert.equal(source.reserve.xmr,.028)
  assert.equal(tracked.nextRung.needXmr,14-6.3597)
  assert.equal(updateJournal([],tracked)[0].kind,'pool')
})

test('missing LP quote is unavailable, not the reserve balance or zero',()=>{
  const source=sample(1,10)
  source.project={pool:'0x'+'aa'.repeat(32),market:null}
  source.index=[]
  const tracked=poolTracker(source)
  assert.equal(tracked.reserve.xmr,null)
  assert.equal(tracked.reserve.rank,null)
  assert.equal(missionProgress(tracked).balanceLabel,'Unavailable')
})
