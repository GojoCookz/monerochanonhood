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
reserveLesson.innerHTML='<summary>Ask Monerochan: reserve or rewards?</summary><div><p><strong>Two destinations. Two jobs.</strong></p><p>The reserve holds the project’s accumulated XMR. The dividend allocation is for holder distributions. XMR sent to holders is not also counted as XMR still held in the reserve.</p><a href="#dividends">Try a dividend scenario →</a></div>'
reserve.querySelector('.reserve-total').after(reserveLesson)
plan.querySelector('h2').textContent='A trade. A reserve. A trail you can follow.'
const planAction=document.createElement('a')
planAction.href='#climb';planAction.className='guide-action';planAction.textContent='Show me the holder board →'
plan.append(planAction)
receipts.querySelector('h2').textContent='She checks the receipts.'
const receiptLesson=document.createElement('details')
receiptLesson.className='guide-note'
receiptLesson.innerHTML='<summary>What should a reserve receipt prove?</summary><div><p>A receipt should link to the actual transaction and identify the asset, amount, source and destination. A deposit is not automatically a market purchase, and a rank change is not proof of a buy.</p><p>The reserve wallet is published. Its address and current XMR balance appear in the reserve panel. A classified purchase and distribution history is still being connected.</p><a href="https://robinhoodchain.blockscout.com/token/0x38F728351fd9565087a4fF0ad5049739e0Ce235c" target="_blank" rel="noopener">Inspect the selected XMR token ↗</a></div>'
receipts.querySelector('.receipt-empty strong').textContent='Reserve wallet published'
receipts.querySelector('.receipt-empty p').textContent='Inspect the reserve address in the panel above. A classified transaction feed is not connected yet; no purchase or payout totals are inferred from its balance.'
receipts.append(receiptLesson)
