import { TOKEN_ADDRESS,TOKEN_POOL_ID } from './token-config.js'

let latest=null
const explorer='https://robinhoodchain.blockscout.com'
const marketUrl='https://dexscreener.com/robinhood/'+TOKEN_POOL_ID
const amount=(raw,decimals,digits=6)=>{
  if(raw===null||raw===undefined)return 'Unavailable'
  const value=Number(raw)/10**decimals
  if(!Number.isFinite(value))return 'Unavailable'
  if(value>0&&value<10**-digits)return '<'+(10**-digits).toFixed(digits)
  return new Intl.NumberFormat('en-US',{maximumFractionDigits:digits,notation:value>=100000?'compact':'standard'}).format(value)
}
const dollars=value=>value===null||value===undefined?'Unavailable':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value)

export function mountProject(){
  const links=document.createElement('div')
  links.className='token-links'
  links.innerHTML=`<a href="${explorer}/token/${TOKEN_ADDRESS}" target="_blank" rel="noopener">CA ${TOKEN_ADDRESS.slice(0,6)}…${TOKEN_ADDRESS.slice(-4)} ↗</a><a href="${marketUrl}" target="_blank" rel="noopener">View market ↗</a>`
  document.querySelector('.hero__copy').append(links)
  const ledger=document.createElement('section')
  ledger.id='live-ledger'
  ledger.className='live-ledger'
  ledger.innerHTML='<h2>Live holder ledger</h2><p id="ledger-status">Reading the token’s distributor…</p><dl><div><dt>XMR paid to holders</dt><dd id="actual-paid">—</dd></div><div><dt>XMR credited</dt><dd id="actual-credited">—</dd></div></dl><p id="stream-note">Credited rewards and completed payments are separate.</p><details><summary>Contract and market sources</summary><div id="project-sources"></div></details>'
  document.querySelector('#screen-dividends').prepend(ledger)
  const button=document.createElement('button')
  button.id='use-live-fee'
  button.className='sim__btn'
  button.type='button'
  button.textContent='Use deployed holder allocation'
  button.disabled=true
  document.querySelector('#calculator').before(button)
  const note=document.createElement('p')
  note.id='live-fee-note'
  note.className='plan-note'
  button.after(note)
  document.querySelector('#fee').step='any'
  button.addEventListener('click',()=>{
    const chain=latest?.project?.onchain
    if(!chain)return
    const field=document.querySelector('#fee')
    field.value=chain.holderAllocationPct.toFixed(6)
    field.dispatchEvent(new Event('input',{bubbles:true}))
    note.textContent='Using the configured holder allocation. Volume, your share and XMR price remain scenario assumptions.'
  })
  const screen=document.querySelector('#screen-dividends')
  const heading=screen.querySelector('.screen-heading')
  heading.querySelector('.eyebrow').textContent='MONEROCHAN DIVIDENDS'
  heading.querySelector('h1').textContent='XMR for holders.'
  heading.querySelector('p:last-of-type').textContent='Track real payouts. Explore a scenario.'
  const simulator=document.createElement('section')
  simulator.id='dividend-simulator'
  for(const child of [...screen.children])if(child!==ledger&&child!==heading)simulator.append(child)
  screen.append(simulator)
  const modes=document.createElement('div')
  modes.className='dividend-modes'
  modes.setAttribute('role','group')
  modes.setAttribute('aria-label','Dividend view')
  modes.innerHTML='<button type="button" data-mode="live">Live payouts</button><button type="button" data-mode="simulator">Simulator</button>'
  screen.prepend(heading,modes)
  function setMode(mode){
    ledger.hidden=mode!=='live'
    simulator.hidden=mode!=='simulator'
    for(const item of modes.querySelectorAll('button'))item.setAttribute('aria-pressed',String(item.dataset.mode===mode))
  }
  modes.addEventListener('click',event=>{const selected=event.target.closest('button');if(selected)setMode(selected.dataset.mode)})
  document.querySelector('.mobile-totals a').addEventListener('click',()=>setMode('live'))
  setMode('live')
  if(latest)renderProject(latest)
}

export function renderProject(snapshot){
  latest=snapshot
  const project=snapshot.project
  const ledger=document.querySelector('#live-ledger')
  if(!ledger||!project)return
  const chain=project.onchain
  const volume=project.volume
  const market=project.market
  const strip=document.querySelector('.mobile-totals')
  const totalLabel=strip.querySelector('div > span')
  const total=strip.querySelector('div > strong')
  const paid=strip.querySelector('a > strong')
  if(volume?.complete&&chain){
    totalLabel.textContent='Total pool volume · XMR'
    total.textContent=amount(volume.raw,chain.xmrDecimals,4)
  }else{
    totalLabel.textContent='24h pool volume · USD'
    total.textContent=market?.volume24hUsd!=null?dollars(market.volume24hUsd):'—'
  }
  paid.textContent=chain?.paidXmrRaw!=null?amount(chain.paidXmrRaw,chain.xmrDecimals)+' XMR':'—'
  strip.querySelector('p').textContent=chain
    ? `${project.contractReadFailed?'Last available':'Contract'} snapshot · block ${chain.blockNumber}`
    : 'Token published · contract totals temporarily unavailable'
  document.querySelector('#actual-paid').textContent=chain?.paidXmrRaw!=null?amount(chain.paidXmrRaw,chain.xmrDecimals)+' XMR':'Unavailable'
  document.querySelector('#actual-credited').textContent=chain?amount(chain.creditedRaw,chain.xmrDecimals)+' XMR':'Unavailable'
  document.querySelector('#ledger-status').textContent=chain
    ? `Distributor reading at ${new Date(chain.checkedAt).toLocaleString()}${project.contractReadFailed?' · stale':''}`
    : 'The CA is connected. Retry after the next refresh for contract totals.'
  if(chain){
    document.querySelector('#stream-note').textContent=`${chain.streamSeconds/3600}-hour streaming window. Credited rewards are not the same as completed payouts.`
    document.querySelector('#use-live-fee').disabled=false
    document.querySelector('#fee').max=String(Math.max(chain.normalBuyFeeBps,chain.normalSellFeeBps)/100)
    document.querySelector('#live-fee-note').textContent=`Configured normal holder allocation: approximately ${chain.holderAllocationPct.toFixed(4)}% of buy volume, before processing adjustments. Use the button to apply it to the simulator.`
    document.querySelector('.thesis > .plan-note').textContent=`Normal buy fee: ${(chain.normalBuyFeeBps/100).toFixed(2)}%. Normal sell fee: ${(chain.normalSellFeeBps/100).toFixed(2)}%. Read from the pool’s fee hook; see Dividends for the split.`
    document.querySelectorAll('.mechanics article p')[0].textContent='The team-designated reserve wallet accumulates XMR with rewards. Reserve funding is tracked separately from the pool’s creator and holder fee allocations.'
    document.querySelectorAll('.mechanics article p')[1].textContent='The token has an XMR dividend distributor. Credited rewards stream under the contract’s rules; only completed withdrawals count as paid.'
    document.querySelector('.treasury__split article:nth-child(2) small').textContent='Distributor connected. See Dividends for on-chain credited and paid totals.'
  }
  const sources=document.querySelector('#project-sources')
  sources.replaceChildren()
  const line=text=>{const p=document.createElement('p');p.textContent=text;sources.append(p)}
  const link=(text,url)=>{const a=document.createElement('a');a.textContent=text;a.href=url;a.target='_blank';a.rel='noopener';sources.append(a)}
  link('Token contract ↗',explorer+'/token/'+TOKEN_ADDRESS)
  if(chain){
    link('Dividend distributor ↗',explorer+'/address/'+chain.distributor)
    line(`Eligible token supply at this block: ${amount(chain.eligibleSupplyRaw,chain.tokenDecimals,2)}. Total token supply: ${amount(chain.totalSupplyRaw,chain.tokenDecimals,2)}.`)
    line(`Normal fee split: ${(chain.platformShareBps/100).toFixed(2)}% platform, ${(chain.creatorShareBps/100).toFixed(2)}% creator, ${(chain.holderShareBps/100).toFixed(2)}% holders. These percentages are shares of the fee, before processing adjustments.`)
    link('Configured creator recipient ↗',explorer+'/address/'+chain.creatorRecipient)
    line('The creator recipient is a separate address from the published reserve. This page does not assume an automatic fixed-percentage transfer to the reserve.')
    line(`Payout source: totalWithdrawn(). Credit source: totalDistributed(). Accounted asset: ${chain.payoutToken}.`)
  }
  if(volume?.complete&&chain){
    line(`Lifetime canonical-pool turnover: ${amount(volume.raw,chain.xmrDecimals)} XMR across ${volume.swapCount} Swap events, blocks ${volume.fromBlock}–${volume.throughBlock}. Each swap’s XMR leg is counted once; separate hook fees and other pools are not included.`)
    if(snapshot.price?.usd)line(`At the current XMR reference price: approximately ${dollars(Number(volume.raw)/10**chain.xmrDecimals*snapshot.price.usd)}. This is a current-value equivalent, not historical dollar volume.`)
  }else line('A complete lifetime pool-volume reading is unavailable. The header shows rolling 24h market volume when available instead.')
  if(market)line(`DexScreener: rolling 24h volume ${dollars(market.volume24hUsd)}, liquidity ${dollars(market.liquidityUsd)}. Read ${new Date(market.checkedAt).toLocaleString()}.`)
  link('Canonical pool on DexScreener ↗',marketUrl)
}
