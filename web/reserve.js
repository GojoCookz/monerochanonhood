import { renderMission } from './mission.js'
import { renderProject } from './project.js'
import { poolTracker } from './pool-tracker.js'
import { TOKEN_POOL_ID } from './token-config.js'

export function renderReserve(snapshot) {
  renderMission(snapshot)
  renderProject(snapshot)
  const reserve=poolTracker(snapshot).reserve
  const panel=document.querySelector('.treasury')
  const link=panel.querySelector('#reserve-address')
  link.textContent='MONEROCHAN / XMR · view pool ↗'
  link.href='https://dexscreener.com/robinhood/'+TOKEN_POOL_ID
  link.hidden=false
  const known=Number.isFinite(reserve.xmr)
  panel.querySelector('.reserve-total strong').textContent=known?reserve.xmr.toFixed(4)+' XMR':'LP balance unavailable'
  panel.querySelector('.phase').textContent='LP RESERVE'
  panel.querySelector('.reserve-total p').textContent=known
    ? `Reported XMR in the trading pool. ${reserve.rank?'Comparison ≈#'+reserve.rank+' against filtered holders. ':''}Read ${new Date(snapshot.project.market.checkedAt).toLocaleString()}.`
    : 'The pool is connected, but its latest reported XMR liquidity is unavailable. Try the next refresh.'
  const custody=panel.querySelector('.treasury__split article')
  custody.querySelector('h3').textContent='Reserve location'
  custody.querySelector('p').textContent='MONEROCHAN / XMR liquidity pool'
  custody.querySelector('small').textContent='The XMR side of the pool is the reserve tracked here. It changes with swaps and is not a standalone explorer wallet.'
  document.querySelector('#track-reserve').textContent='Follow the LP reserve →'
  document.querySelector('.hero small').textContent='XMR-paired liquidity · holder distributions tracked separately'
}
document.addEventListener('click',event=>{
  if(event.target.closest('#track-reserve, #enter-world'))window.dispatchEvent(new Event('track-reserve'))
})
