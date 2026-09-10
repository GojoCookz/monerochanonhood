// Screens reuse the live Climb DOM so address state and listeners survive navigation.
import { mountMission } from './mission.js'
import { mountProject } from './project.js'
const main = document.querySelector('main')
// The project module fills this strip from canonical-pool swaps and the token's
// distributor. Never substitute pair-token volume or infer payouts from tax.
const mobileTotals=document.createElement('aside')
mobileTotals.className='mobile-totals'
mobileTotals.setAttribute('aria-label','Project lifetime totals')
mobileTotals.innerHTML='<div><span>Total pool volume · XMR</span><strong>—</strong></div><a href="#dividends"><span>XMR paid to holders</span><strong>— <small>XMR</small></strong></a><p>Reading MONEROCHAN contract totals…</p>'
document.querySelector('.brand').after(mobileTotals)
const reserve = document.createElement('section')
reserve.id = 'screen-reserve'
reserve.className = 'app-screen'
const climb = document.querySelector('#climb')
climb.classList.add('app-screen')
const dividends = document.createElement('section')
dividends.id = 'screen-dividends'
dividends.className = 'app-screen'
const hero = document.querySelector('.hero')
hero.querySelector('.eyebrow').textContent = 'YOU’RE INVITED TO THE CLIMB.'
hero.querySelector('h1').innerHTML = 'One reserve.<br>One shared climb.'
hero.querySelector('.hero__copy > p:not(.eyebrow)').textContent = 'Join Monerochan’s mission to reach the top of Hood’s XMR holder board. One community following one reserve. No purchase needed to explore.'
hero.querySelector('.primary-link').textContent = 'Enter the world →'
hero.querySelector('.primary-link').id = 'enter-world'
hero.querySelector('.primary-link').href = '#climb'
hero.querySelector('img').src = '/assets/monerochan-perch-raw.png'
hero.querySelector('img').alt = 'Monerochan sitting on a silver ledge and pointing toward the app controls'
hero.querySelector('img').classList.add('hero-perch')
for (const selector of ['.hero','.treasury','.thesis','.receipts']) reserve.append(document.querySelector(selector))
const egg=document.createElement('details')
egg.className='umbrella-egg'
egg.innerHTML='<summary>Looks like rain. Take shelter?</summary><img src="/assets/monerochan-umbrella.png" alt="Monerochan smiling beneath an orange umbrella while Monero emblems fall around her" loading="lazy"><p>You found her rainy-day hideout.</p>'
reserve.append(egg)
main.insertBefore(reserve, climb)
main.insertBefore(dividends, document.querySelector('.site-footer'))
dividends.innerHTML = `
  <header class="screen-heading"><p class="eyebrow">TRY THE THESIS</p><h1>Your share.<br>Your scenario.</h1><p>Change the assumptions. See the calculation.</p><div class="screen-mascot pose-crown" aria-hidden="true"></div></header>
  <p class="scenario-label">SIMULATOR · NOT A FORECAST OR LIVE PAYOUT</p>
  <form id="calculator" class="calculator">
    <div class="calc-result"><span>Estimated distribution for this period</span><output id="payout">—</output><small id="payout-detail">Enter your assumptions below.</small></div>
    <label>Eligible trading volume, USD<input id="volume" type="number" min="0" max="1000000000000" step="any" value="100000" required></label>
    <label>Your share of eligible supply <output id="share-label">1%</output><input id="share" type="range" min="0" max="10" step="0.1" value="1"></label>
    <label>Dividend allocation, % of volume<input id="fee" type="number" min="0" max="3" step="0.01" value="1.5" required></label>
    <label>Assumed XMR price, USD<input id="xmr-price" type="number" min="0.01" max="1000000000" step="any" value="500" required></label>
    <button type="reset" class="sim__btn">Reset assumptions</button>
  </form>
  <details class="calc-notes"><summary>How is this calculated?</summary><p>Volume × dividend allocation × your share of eligible supply. Divide the dollar equivalent by the assumed XMR price. Defaults are illustrative inputs, not project statistics. A 1.5% allocation means half of a 3% trading fee, not 1.5% of the tax collected.</p><p>No reinvestment, conversion costs or changing holder eligibility are modelled. Real distributions depend on the deployed rules and eligible volume.</p></details>`
const nav = document.createElement('nav')
nav.className = 'app-nav'
nav.setAttribute('aria-label','Main screens')
nav.innerHTML = '<a href="#reserve">Reserve</a><a href="#climb">The Climb</a><a href="#dividends">Dividends</a>'
document.body.append(nav)
// Put the demonstration beside the board rather than after the whole section.
const sim = document.querySelector('.sim')
climb.insertBefore(sim, document.querySelector('#board'))
document.querySelector('.sim__hint').textContent = 'Illustrative motion preview'
mountMission(climb)
document.querySelector('.brand a').href = '#reserve'
document.querySelector('.site-footer a').href = '#reserve'
const screens = { reserve, climb, dividends }
function route() {
  const key = location.hash.slice(1)
  const current = screens[key] ? key : 'reserve'
  for (const [name, screen] of Object.entries(screens)) screen.hidden = name !== current
  for (const a of nav.querySelectorAll('a')) {
    if (a.hash === '#'+current) a.setAttribute('aria-current','page')
    else a.removeAttribute('aria-current')
  }
  document.body.dataset.screen = current
  window.scrollTo(0,0)
  window.dispatchEvent(new Event('resize'))
}
window.addEventListener('hashchange',route)
route()
const form = document.querySelector('#calculator')
function calculate() {
  const volume = form.querySelector('#volume').valueAsNumber
  const fee = form.querySelector('#fee').valueAsNumber
  const share = form.querySelector('#share').valueAsNumber
  const price = form.querySelector('#xmr-price').valueAsNumber
  document.querySelector('#share-label').textContent = share+'%'
  const valid = form.checkValidity() && [volume,fee,share,price].every(Number.isFinite)
  const amount = volume * fee / 100 * share / 100
  document.querySelector('#payout').textContent = valid ? (amount/price).toFixed(5)+' XMR' : 'Check inputs'
  document.querySelector('#payout-detail').textContent = valid ? '$'+amount.toFixed(2)+' equivalent · illustrative period' : 'Use non-negative values and a positive XMR price.'
}
form.addEventListener('input',calculate)
form.addEventListener('submit',e=>e.preventDefault())
form.addEventListener('reset',()=>setTimeout(calculate,0))
calculate()
mountProject()
