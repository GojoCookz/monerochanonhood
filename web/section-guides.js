// New section-specific illustrations: guardian, presenter, receipt inspector.
const reserve=document.querySelector('.treasury')
const plan=document.querySelector('.thesis')
const receipts=document.querySelector('.receipts')
function art(section,file,alt){
  const img=document.createElement('img')
  img.className='section-guide'
  img.src='/assets/'+file+'.webp'
  img.alt=alt
  img.width=360;img.height=480;img.loading='lazy'
  section.classList.add('has-guide')
  section.prepend(img)
}
art(reserve,'monerochan-guardian','Monerochan watching over a small Monero safe')
art(plan,'monerochan-presenter','Monerochan pointing toward the accumulation plan')
art(receipts,'monerochan-inspector','Monerochan checking a receipt with a magnifying glass')
const reserveLesson=document.createElement('details')
reserveLesson.className='guide-note'
reserveLesson.innerHTML='<summary>Ask Monerochan: reserve or rewards?</summary><div><p><strong>The LP is the reserve.</strong></p><p>The reserve shown here is the XMR side of our trading pool. Holder rewards are accounted for separately by the dividend distributor. Pool liquidity can rise or fall as people trade.</p><a href="#dividends">Explore holder payouts →</a></div>'
reserve.querySelector('.reserve-total').after(reserveLesson)
plan.querySelector('h2').textContent='A trade. A reserve. A trail you can follow.'
const planAction=document.createElement('a')
planAction.href='#climb';planAction.className='guide-action';planAction.textContent='Show me the holder board →'
plan.append(planAction)
receipts.querySelector('h2').textContent='She checks the receipts.'
const receiptLesson=document.createElement('details')
receiptLesson.className='guide-note'
receiptLesson.innerHTML='<summary>What should a pool receipt prove?</summary><div><p>A receipt should identify the pool, traded assets and actual transaction. A change in LP liquidity is not automatically a holder payout.</p><p>The Reserve screen links to the MONEROCHAN/XMR pool. The Dividends screen separately reports its distributor’s credits and completed withdrawals.</p><a href="https://robinhoodchain.blockscout.com/token/0x38F728351fd9565087a4fF0ad5049739e0Ce235c" target="_blank" rel="noopener">Inspect the selected XMR token ↗</a></div>'
receipts.querySelector('.receipt-empty strong').textContent='Pool activity and payouts, separately'
receipts.querySelector('.receipt-empty p').textContent='Follow swaps through the pool link and verify payout totals through the linked distributor. Neither figure is inferred from the other.'
receipts.append(receiptLesson)
