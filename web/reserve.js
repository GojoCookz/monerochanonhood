import { renderMission } from './mission.js'

export function renderReserve(snapshot) {
  renderMission(snapshot)
  const reserve=snapshot.reserve
  if (!reserve?.address) return
  const panel=document.querySelector('.treasury')
  const address=panel.querySelector('#reserve-address')
  address.textContent=reserve.address
  address.href='https://robinhoodchain.blockscout.com/address/'+reserve.address
  address.hidden=false
  const known=reserve.xmr!==null && Number.isFinite(reserve.xmr)
  panel.querySelector('.reserve-total strong').textContent=known ? reserve.xmr.toFixed(4)+' XMR' : 'Balance unavailable'
  panel.querySelector('.phase').textContent='WALLET PUBLISHED'
  panel.querySelector('.reserve-total p').textContent=known
    ? `${reserve.rank ? 'Rank #'+reserve.rank+' in the filtered holder snapshot.' : 'Unranked in the holder snapshot.'} Balance checked ${new Date(reserve.balanceCheckedAt ?? snapshot.takenAt).toLocaleString()}.`
    : 'The reserve address is published, but its balance could not be read. Try again after the next refresh.'
  const custody=panel.querySelector('.treasury__split article')
  custody.querySelector('p').textContent=reserve.accountType==='wallet' ? 'Standard wallet' : reserve.accountType==='contract' ? 'Contract account' : 'Custody unverified'
  custody.querySelector('small').textContent=reserve.accountType==='wallet' ? 'The explorer reports a non-contract account. Multisig custody is not established.' : 'Contract status alone does not establish a multisig threshold or signer policy.'
  document.querySelector('.hero small').textContent='Reserve wallet published · token and dividend contracts not connected'
}

document.addEventListener('click',event=>{
  if(event.target.closest('#track-reserve, #enter-world'))window.dispatchEvent(new Event('track-reserve'))
})
