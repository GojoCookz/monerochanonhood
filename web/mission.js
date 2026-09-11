import { missionProgress, updateJournal } from './mission-state.js'

let latest=null
let entries=[]
let undoEntries=null
let undoTimer=null
const storageKey='monerochan.mission-observations.v1'
try { entries=JSON.parse(localStorage.getItem(storageKey)??'[]') } catch { entries=[] }

export function mountMission(climb) {
  const card=document.createElement('section')
  card.className='mission-card'
  card.id='mission-card'
  card.setAttribute('aria-label','Shared reserve mission')
  card.innerHTML='<div class="mission-title"><strong>One reserve. Same side.</strong><span>GOAL #1</span></div><div class="mission-reading"><span id="mission-rank">Reading the reserve…</span><span id="mission-balance">— XMR</span></div><p id="mission-next" aria-live="polite">Waiting for the first snapshot.</p><ol id="mission-checkpoints" aria-label="Current rank checkpoints"></ol><p id="mission-source">Selected XMR on Hood · known pools excluded</p>'
  climb.querySelector('.climb__head').after(card)
  climb.querySelector('.climb__lede').textContent='Our shared mission: follow the reserve to the top of Hood’s XMR holder board.'

  const toolbar=document.createElement('div')
  toolbar.className='mission-tools'
  const personal=document.createElement('details')
  personal.className='mission-personal'
  personal.innerHTML='<summary>Find your wallet</summary><div class="wallet-input-panel"></div>'
  const content=personal.querySelector('.wallet-input-panel')
  content.append(document.querySelector('#find'),document.querySelector('#views'))
  toolbar.append(personal,climb.querySelector('.sim'))
  document.querySelector('#board').before(toolbar)
  personal.addEventListener('keydown',event=>{
    if(event.key==='Escape'){personal.open=false;personal.querySelector('summary').focus()}
  })
  document.addEventListener('click',event=>{if(personal.open&&!personal.contains(event.target))personal.open=false})

  const facts=document.createElement('details')
  facts.className='mission-more'
  facts.innerHTML='<summary>Market snapshot, rank gaps & sources</summary>'
  facts.append(document.querySelector('#facts'),climb.querySelector('.ladder'),climb.querySelector('.rules'),climb.querySelector('.climb__foot'))
  climb.append(facts)

  const journal=document.createElement('details')
  journal.id='mission-journal'
  journal.className='mission-more'
  journal.innerHTML='<summary>Your expedition journal</summary><p>Observed on this device only. Balance changes are not necessarily purchases. Preview animations are never recorded here.</p><ol id="mission-observations"></ol><button type="button" id="clear-observations">Clear local journal</button>'
  facts.before(journal)
  const clearButton=journal.querySelector('button')
  clearButton.addEventListener('click',()=>{
    clearTimeout(undoTimer)
    if(undoEntries){
      entries=latest?updateJournal(undoEntries,latest):undoEntries
      undoEntries=null
      try{localStorage.setItem(storageKey,JSON.stringify(entries))}catch{}
      clearButton.textContent='Clear local journal'
    }else{
      undoEntries=entries
      entries=[]
      try{localStorage.removeItem(storageKey)}catch{}
      clearButton.textContent='Undo clear'
      undoTimer=setTimeout(()=>{undoEntries=null;clearButton.textContent='Clear local journal'},10000)
    }
    drawJournal()
  })
  if(latest)renderMission(latest)
}

function drawJournal(){
  const list=document.querySelector('#mission-observations')
  if(!list)return
  list.replaceChildren()
  if(!entries.length){
    const li=document.createElement('li')
    li.textContent='Your next verified snapshot starts the journal.'
    list.append(li)
    return
  }
  entries.slice(-6).reverse().forEach(entry=>{
    const li=document.createElement('li')
    const time=document.createElement('time')
    time.dateTime=entry.at
    time.textContent=new Date(entry.at).toLocaleString()
    const text=document.createElement('span')
    text.textContent=`${entry.xmr.toFixed(4)} XMR · ${entry.rank===null?'unranked':'rank #'+entry.rank}`
    li.append(time,text)
    list.append(li)
  })
}

export function renderMission(snapshot){
  latest=snapshot
  const card=document.querySelector('#mission-card')
  if(!card)return
  const progress=missionProgress(snapshot)
  document.querySelector('#mission-rank').textContent=progress.rankLabel
  document.querySelector('#mission-balance').textContent=progress.balanceLabel
  document.querySelector('#mission-next').textContent='Next checkpoint: '+progress.next
  const checkpoints=document.querySelector('#mission-checkpoints')
  checkpoints.replaceChildren()
  for(const stage of progress.stages){
    const li=document.createElement('li')
    li.textContent=stage.label
    li.dataset.reached=String(stage.reached)
    li.setAttribute('aria-label',stage.label+(stage.reached?' reached in this snapshot':' not reached'))
    checkpoints.append(li)
  }
  card.dataset.completed=String(progress.completed)
  const source=document.querySelector('#mission-source')
  source.textContent=`Filtered holder rank · known pools excluded${snapshot.reserve.allAddressRank?' · all-address rank #'+snapshot.reserve.allAddressRank:''} · `+new Date(snapshot.takenAt).toLocaleTimeString()
  entries=updateJournal(entries,snapshot)
  try{localStorage.setItem(storageKey,JSON.stringify(entries))}catch{}
  drawJournal()
}
