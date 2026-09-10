/* THE CLIMB — renderer
   Rules this file obeys:
   - Every number rendered comes from /api/climb. Nothing is invented.
   - If data is stale or missing, the UI says so. A stale number labelled
     stale is honest; a stale number labelled live is a lie.
   - Simulation mode is visibly marked and cannot be mistaken for real data. */

import { renderReserve } from './reserve.js'

const $ = (id) => document.getElementById(id)

const els = {
  status: $('status'),
  statusText: $('status-text'),
  lede: $('lede'),
  facts: $('facts'),
  find: $('find'),
  addr: $('addr'),
  findMsg: $('find-msg'),
  views: $('views'),
  board: $('board'),
  rows: $('rows'),
  climber: $('climber'),
  target: $('target'),
  gap: $('gap'),
  ladder: $('ladder'),
  pools: $('pools'),
  rulesNote: $('rules-note'),
  source: $('source'),
  simBtn: $('sim-btn'),
}

const REFRESH_MS = 45_000
const TOP_ROWS = 5
const NEIGHBOURS = 2
const STORE_KEY = 'climb.address'

let live = null
let sim = null
let simTimer = null
let me = null // { address, rank, xmr, kind }
let view = 'reserve'
let targetKey = null
let wheelOffset = 0

const data = () => sim ?? live

/* ---------- format ---------- */

const fmtXmr = (n) => (n == null ? '—' : n >= 1000 ? n.toFixed(1) : n.toFixed(4))
const fmtUsd = (n) =>
  n == null ? '—' : n >= 1000 ? '$' + Math.round(n).toLocaleString('en-US') : '$' + n.toFixed(0)
const shortAddr = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`
const isAddr = (s) => /^0x[0-9a-fA-F]{40}$/.test(s.trim())

/** Deterministic colour from the address. Identity, not decoration.
 *  Constrained to a 15-48deg ember band: a full-spectrum hash reads as a
 *  generic token list and steals attention from the row that should own it. */
function chipColor(addr) {
  let h = 0
  for (let i = 2; i < addr.length; i++) h = (h * 31 + addr.charCodeAt(i)) >>> 0
  return `hsl(${15 + (h % 34)} ${18 + ((h >> 6) % 26)}% ${26 + ((h >> 11) % 20)}%)`
}

function ago(iso) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso)) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  return `${Math.round(s / 3600)}h ago`
}

const usd = (xmr) => (data()?.price ? xmr * data().price.usd : null)

/* ---------- lookup ---------- */

function lookup(address) {
  const d = data()
  if (!d || !Array.isArray(d.index)) return null
  const key = address.toLowerCase()

  const pool = (d.poolIndex ?? []).find(([a]) => a === key)
  if (pool) return { address, kind: 'pool', label: pool[1], xmr: pool[2], rank: null }

  const hit = (d.index ?? []).find(([a]) => a === key)
  if (hit) return { address, kind: 'wallet', rank: hit[1], xmr: hit[2] }

  // Not in the holder list at all: the address holds zero XMR on this chain.
  return { address, kind: 'zero', rank: null, xmr: 0 }
}

function setMe(address, { persist = true, focusView = true } = {}) {
  const found = lookup(address)
  me = found
  if (persist) {
    try {
      localStorage.setItem(STORE_KEY, address)
    } catch {}
  }

  if (!found) {
    els.findMsg.textContent = 'The holder index is still loading. Try Find me again shortly.'
    return
  }
  if (found.kind === 'pool') {
    els.findMsg.dataset.tone = 'warn'
    els.findMsg.textContent = `That address is ${found.label} — a liquidity pool, not a wallet. Pools are not ranked.`
    els.views.hidden = true
    view = 'top'
  } else if (found.kind === 'zero') {
    els.findMsg.dataset.tone = 'zero'
    els.findMsg.textContent = 'This address is not in the latest holder snapshot. Try another address or check again after the next refresh.'
    els.views.hidden = true
    view = 'top'
  } else {
    els.findMsg.dataset.tone = 'ok'
    const pct = ((found.rank / data().totals.wallets) * 100).toFixed(1)
    els.findMsg.textContent = `You are #${found.rank} of ${data().totals.wallets} — top ${pct}% of Monero wallets on this chain.`
    els.views.hidden = false
    view = focusView ? 'me' : 'reserve'
    wheelOffset = 0
    syncViewButtons()
    const personal=document.querySelector('.mission-personal')
    if(personal){
      personal.querySelector('summary').textContent=`Your wallet · #${found.rank}`
      if(focusView)personal.open=false
    }
  }
  render(data())
}

function clearMe() {
  me = null
  targetKey = null
  view = 'reserve'
  wheelOffset = 0
  els.findMsg.textContent = ''
  els.findMsg.removeAttribute('data-tone')
  els.views.hidden = true
  els.addr.value = ''
  const personal=document.querySelector('.mission-personal summary')
  if(personal)personal.textContent='Find your wallet'
  try {
    localStorage.removeItem(STORE_KEY)
  } catch {}
  render(data())
}

/* ---------- FLIP ---------- */

function captureRects() {
  const map = new Map()
  for (const el of els.rows.children) map.set(el.dataset.key, el.getBoundingClientRect().top)
  return map
}

function playFlip(before) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  for (const el of els.rows.children) {
    const prev = before.get(el.dataset.key)
    if (prev == null) continue
    const delta = prev - el.getBoundingClientRect().top
    if (!delta) continue
    // Transitions, not keyframes: a rank update mid-flight retargets
    // smoothly instead of restarting from zero.
    el.style.transition = 'none'
    el.style.transform = `translateY(${delta}px)`
    requestAnimationFrame(() => {
      el.style.transition = 'transform var(--dur) var(--ease)'
      el.style.transform = ''
    })
  }
}

/* ---------- rows ---------- */

function buildRows(d) {
  const all = d.wallets.map((w) => ({
    key: w.address.toLowerCase(),
    rank: w.rank,
    addr: w.address,
    xmr: w.xmr,
    delta: w.delta,
  }))

  let list
  if (view === 'me' && me?.kind === 'wallet') {
    const lo = Math.max(1, me.rank - NEIGHBOURS)
    const hi = me.rank + NEIGHBOURS
    list = (d.index ?? [])
      .filter(([, rank]) => rank >= lo && rank <= hi)
      .map(([a, rank, xmr]) => ({ key: a, rank, addr: a, xmr, delta: null }))
    // wallets[] is only the top 40; if the user sits deeper, synthesise their
    // own row from the index so they always see themselves.
    if (!list.some((r) => r.key === me.address.toLowerCase())) {
      list = (d.index ?? [])
        .filter(([, rank]) => rank >= lo && rank <= hi)
        .map(([a, rank, xmr]) => ({ key: a, rank, addr: a, xmr, delta: null }))
    }
  } else {
    list = sim ? all : (d.index ?? []).map(([a,rank,xmr])=>({key:a,addr:a,rank,xmr,delta:null}))
  }

  for (const r of list) {
    r.me = me?.kind === 'wallet' && r.key === me.address.toLowerCase()
  }

  // our reserve
  const res = d.reserve
  const resKey = res.deployed ? res.address.toLowerCase() : 'pending'
  const existing = list.find((r) => r.key === resKey)
  if (existing) {
    existing.us = true
    existing.label = 'OUR RESERVE'
  } else {
    list.push({
      key: resKey,
      rank: res.deployed ? res.rank : null,
      addr: res.deployed ? res.address : '',
      xmr: res.deployed ? res.xmr : 0,
      delta: res.delta,
      us: true,
      label: 'OUR RESERVE',
      pending: !res.deployed,
    })
  }

  // the user, when they hold nothing, still gets a row — at the bottom,
  // labelled honestly. A dead end converts nobody.
  if (me && me.kind === 'zero') {
    list.push({
      key: 'me-zero',
      rank: null,
      addr: me.address,
      xmr: 0,
      delta: null,
      me: true,
      zero: true,
      label: 'YOU',
    })
  }

  list.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
  const anchor = sim || view==='reserve' ? list.findIndex(r=>r.us) : view==='me' ? list.findIndex(r=>r.me) : 2
  const center = Math.max(0,Math.min(list.length-1,Math.max(0,anchor)+wheelOffset))
  const previousButton=document.querySelector('.wheel-controls [data-step="-1"]')
  const nextButton=document.querySelector('.wheel-controls [data-step="1"]')
  if(previousButton)previousButton.disabled=center===0
  if(nextButton)nextButton.disabled=center===list.length-1
  const rowHeight=Number.parseFloat(getComputedStyle(els.board).getPropertyValue('--row-h'))||52
  els.rows.style.paddingTop = `${Math.max(0,2-center)*rowHeight}px`
  return list.slice(Math.max(0,center-2),center+3).slice(0,5)
}

function renderRows(d) {
  const before = captureRects()
  const rows = buildRows(d)
  const seen = new Set()

  for (const r of rows) {
    seen.add(r.key)
    let el = els.rows.querySelector(`[data-key="${CSS.escape(r.key)}"]`)
    if (!el) {
      el = document.createElement('div')
      el.className = 'row'
      el.dataset.key = r.key
      el.setAttribute('role', 'listitem')
      el.innerHTML = `
        <div class="row__rank"></div>
        <div class="row__who"><span class="chip"></span><span class="row__id"></span></div>
        <div class="row__xmr"></div>
        <div class="row__delta"></div>`
      els.rows.appendChild(el)
    }

    el.classList.toggle('row--us', Boolean(r.us))
    el.classList.toggle('row--me', Boolean(r.me))
    el.classList.toggle('row--pending', Boolean(r.pending || r.zero))
    el.classList.toggle('is-target', targetKey === r.key)

    // every ranked rival is a tappable target
    const targetable = !r.us && !r.me && r.rank != null
    el.classList.toggle('is-targetable', targetable)
    if (targetable) {
      el.tabIndex = 0
      el.setAttribute('role', 'button')
      el.removeAttribute('aria-label')
      el.title = 'Inspect the balance gap to this holder'
    } else {
      el.removeAttribute('tabindex')
      el.setAttribute('role', 'listitem')
      el.removeAttribute('aria-label')
    }

    el.querySelector('.row__rank').textContent = r.rank == null ? '—' : `#${r.rank}`

    const chip = el.querySelector('.chip')
    chip.style.background =
      r.pending || r.zero
        ? 'repeating-linear-gradient(45deg,#3a2a18 0 3px,transparent 3px 6px)'
        : r.us
          ? 'var(--orange)'
          : r.me
            ? 'var(--me)'
            : chipColor(r.addr)

    el.querySelector('.row__id').textContent = r.label ?? shortAddr(r.addr)
    el.querySelector('.row__xmr').innerHTML = r.pending
      ? '<span>not live</span>'
      : r.zero
        ? '<span>0 XMR</span>'
        : `${fmtXmr(r.xmr)}<span>XMR</span>`

    const dd = el.querySelector('.row__delta')
    if (r.delta == null || r.delta === 0) {
      dd.textContent = r.delta === 0 ? '·' : ''
      dd.removeAttribute('data-dir')
    } else {
      dd.textContent = `${r.delta > 0 ? '▲' : '▼'}${Math.abs(r.delta)}`
      dd.dataset.dir = r.delta > 0 ? 'up' : 'down'
    }
  }

  for (const el of [...els.rows.children]) if (!seen.has(el.dataset.key)) el.remove()

  const order = new Map(rows.map((r, i) => [r.key, i]))
  ;[...els.rows.children]
    .sort((a, b) => order.get(a.dataset.key) - order.get(b.dataset.key))
    .forEach((el) => els.rows.appendChild(el))

  playFlip(before)
  positionClimber()
}

/* ---------- climber ---------- */

/** She follows the user once they identify themselves — it is their moment.
 *  With no address, she rides our reserve row. One character, one focus. */
function climberRow() {
  return sim || view==='reserve' ? els.rows.querySelector('.row--us') : els.rows.querySelector('.row--me') ?? els.rows.querySelector('.row--us')
}

function positionClimber() {
  const row = climberRow()
  if (!row) {
    els.climber.hidden = true
    return
  }
  els.climber.hidden = false

  const perched = !sim && view==='me' && row.classList.contains('row--me')
  els.climber.dataset.mode = perched ? 'perch' : 'hang'

  const art = els.climber.querySelector('.climber__art')
  const artH = art.getBoundingClientRect().height || 104

  let top
  if (perched) {
    // Sitting ON the row's top border. In the `overtake` cell the bar sits
    // ~54% down the sprite, so shift her up by that fraction to land her
    // seat exactly on the line.
    top = row.offsetTop - artH * 0.54 + els.climber.offsetHeight / 2
    setPose('overtake')
  } else {
    top = row.offsetTop + (row.offsetHeight - els.climber.offsetHeight) / 2
  }
  els.climber.style.transform = `translateY(${top}px)`
}

function setPose(pose) {
  els.climber.dataset.pose = pose
}

/* ---------- targeting ---------- */

function renderTarget(d) {
  if (!targetKey) {
    els.target.hidden = true
    return
  }
  const row = (d.index ?? []).find(([a]) => a === targetKey)
  if (!row) {
    els.target.hidden = true
    return
  }
  const [addr, rank, xmr] = row
  const have = me?.xmr ?? 0
  const need = Math.max(0, xmr - have)
  const passed = need <= 0

  els.target.hidden = false
  els.target.innerHTML = `
    <div class="target__head">
      <span class="target__label">${passed ? 'Already ahead of' : 'To pass'} #${rank}</span>
      <button type="button" class="target__x" id="target-x" aria-label="Clear target">clear</button>
    </div>
    <div class="target__body">
      <span class="target__addr">${shortAddr(addr)}</span>
      <span class="target__need">${
        passed
          ? '<em>you are already above this wallet</em>'
          : `${fmtXmr(need)} XMR <b>${fmtUsd(usd(need))}</b>`
      }</span>
    </div>
    ${
      me
        ? ''
        : '<p class="target__hint">Enter your address above to price this against what you already hold.</p>'
    }`
  $('target-x').addEventListener('click', () => {
    targetKey = null
    render(data())
  })
}

/* ---------- panels ---------- */

function renderFacts(d) {
  const t = d.totals
  // Fixed 2dp: side by side, 42.0137 next to 127.95 reads as a bug.
  const f2 = (n) => n.toFixed(2)
  els.facts.innerHTML = `
    <div><dt>Wallets holding</dt><dd>${t.wallets}<small>excludes ${t.pools} pool contracts</small></dd></div>
    <div><dt>Hold ≥ 1 XMR</dt><dd>${t.walletsAboveOne}<small>on the entire chain</small></dd></div>
    <div><dt>In wallets</dt><dd>${f2(t.walletXmr)}<small>XMR held as positions</small></dd></div>
    <div><dt>In pools</dt><dd>${f2(t.poolXmr)}<small>XMR as market inventory</small></dd></div>`
}

function renderGap(d) {
  if (view !== 'reserve' && me?.kind === 'wallet' && me.rank === 1) {
    els.gap.hidden = false
    els.gap.innerHTML = '<div class="gap__label">Your position</div><div class="gap__big">Top of the board.</div><div class="gap__sub">You lead the current filtered holder snapshot.</div>'
    return
  }
  // When the visitor has identified themselves, the gap is THEIR gap.
  if (!sim && view !== 'reserve' && me && me.kind !== 'pool') {
    const idx = d.index ?? []
    const above = me.rank ? idx.find(([, rank]) => rank === me.rank - 1) : idx[idx.length - 1]
    const top10 = idx.find(([, rank]) => rank === 10)
    const targetRow = me.rank && above ? above : top10
    if (!targetRow) {
      els.gap.hidden = true
      return
    }
    const need = Math.max(0, targetRow[2] - me.xmr)
    els.gap.hidden = false
    els.gap.innerHTML = `
      <div class="gap__label">${
        me.rank ? `Your gap to #${me.rank - 1}` : 'What it costs you to enter the top 10'
      }</div>
      <div class="gap__big">${fmtXmr(need)} XMR</div>
      <div class="gap__sub">${fmtUsd(usd(need))} at ${
        d.price ? '$' + d.price.usd.toFixed(2) : 'unknown'
      } per XMR${me.rank ? '' : ' — you hold none yet'}</div>`
    return
  }

  const r = d.nextRung
  if (!r) {
    els.gap.hidden = true
    return
  }
  els.gap.hidden = false
  const deployed = d.reserve.deployed
  els.gap.innerHTML = `
    <div class="gap__label">${deployed ? `Gap to #${r.rank}` : `Cost to enter the top ${r.rank}`}</div>
    <div class="gap__big">${fmtXmr(r.needXmr)} XMR</div>
    <div class="gap__sub">${fmtUsd(r.needUsd)} at ${
      d.price ? '$' + d.price.usd.toFixed(2) : 'unknown'
    } per XMR${deployed ? '' : ' — the reserve is not deployed yet'}</div>`
}

function renderLadder(d) {
  // Say the target once, price it once.
  els.ladder.innerHTML = d.ladder
    .map((r) => {
      const need = !sim && view !== 'reserve' && me ? Math.max(0, r.holderXmr - me.xmr) : r.needXmr
      const done = need <= 0
      return `
      <li class="rung${done ? ' rung--done' : ''}">
        <span class="rung__rank">#${r.rank}</span>
        <span class="rung__what">${
          r.rank === 1 ? 'the biggest Monero wallet on the chain' : `pass the wallet sitting at #${r.rank}`
        }</span>
        <span class="rung__cost">${
          done ? '<em>cleared</em>' : `${fmtUsd(usd(need))}<small>${fmtXmr(need)} XMR</small>`
        }</span>
      </li>`
    })
    .join('')
}

function renderRules(d) {
  els.pools.innerHTML = d.pools
    .map((p) => `<li><span>${p.label ?? shortAddr(p.address)}</span><b>${fmtXmr(p.xmr)} XMR</b></li>`)
    .join('')
  els.rulesNote.textContent =
    d.source.marketExclusions === 'full'
      ? 'Pool contracts are identified from the live DEX pair list, so the exclusion updates itself as new pools appear.'
      : 'The DEX pair list could not be reached on this refresh, so only the Uniswap v4 PoolManager is excluded. Some pool contracts may still be ranked as wallets.'
}

function renderStatus(d) {
  const age = (Date.now() - new Date(d.takenAt)) / 1000
  const state = age < 300 ? 'live' : 'stale'
  els.status.dataset.state = state
  els.statusText.textContent = `${state} · ${ago(d.takenAt)}`
}

function renderSource(d) {
  els.source.innerHTML = [
    `Ranked from ${d.source.holders} · ${d.source.pagesCrawled} pages · crawl ${(d.crawlMs / 1000).toFixed(1)}s`,
    `Monero on Robinhood Chain · <a href="https://robinhoodchain.blockscout.com/token/${d.token.address}" target="_blank" rel="noopener">${shortAddr(d.token.address)}</a>`,
    d.price ? `Price ${d.price.basis} (${d.price.pools} pools)` : 'Price unavailable this refresh',
  ].join('<br>')
}

function render(d) {
  if (!d) return
  renderStatus(d)
  renderFacts(d)
  renderRows(d)
  renderTarget(d)
  renderGap(d)
  renderLadder(d)
  renderRules(d)
  renderSource(d)
}

/* ---------- events ---------- */

els.rows.addEventListener('click', (e) => {
  const row = e.target.closest('.row')
  if (!row || !row.classList.contains('is-targetable')) return
  targetKey = targetKey === row.dataset.key ? null : row.dataset.key
  render(data())
})

els.rows.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return
  const row = e.target.closest('.row')
  if (!row || !row.classList.contains('is-targetable')) return
  e.preventDefault()
  targetKey = targetKey === row.dataset.key ? null : row.dataset.key
  render(data())
})

els.find.addEventListener('submit', (e) => {
  e.preventDefault()
  const v = els.addr.value.trim()
  if (!v) return clearMe()
  if (!isAddr(v)) {
    els.findMsg.dataset.tone = 'warn'
    els.findMsg.textContent = 'That is not a valid address. It should start with 0x and have 40 hex characters after it.'
    return
  }
  setMe(v)
})

function syncViewButtons() {
  for (const b of els.views.querySelectorAll('.views__btn')) {
    b.classList.toggle('is-on', b.dataset.view === view)
    b.setAttribute('aria-pressed', String(b.dataset.view === view))
  }
}

els.views.addEventListener('click', (e) => {
  const btn = e.target.closest('.views__btn')
  if (!btn) return
  if (sim) stopSim()
  if (btn.dataset.view === 'me' && me?.kind !== 'wallet') {
    els.findMsg.textContent = 'Enter a ranked wallet address and press Find me to see its neighbours.'
    els.addr.focus()
    els.find.scrollIntoView({ block: 'center', behavior: 'auto' })
    return
  }
  view = btn.dataset.view
  targetKey = null
  syncViewButtons()
  render(data())
  const personal=document.querySelector('.mission-personal')
  if(personal)personal.open=false
  els.findMsg.textContent = view === 'me'
    ? `Showing neighbours around #${me.rank} — ${shortAddr(me.address)}.`
    : `Showing the top ${TOP_ROWS} holders. Switch to Around me for your wallet.`
})

// `/` focuses the address field, the way search fields behave everywhere else
window.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== els.addr) {
    e.preventDefault()
    els.addr.focus()
  }
})

window.addEventListener('resize', positionClimber)

/* ---------- data ---------- */

async function load() {
  try {
    const res = await fetch('/api/climb', { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    live = await res.json()
    els.simBtn.disabled=false
    const followButton=document.querySelector('.wheel-controls [data-step="0"]')
    if(followButton)followButton.disabled=false
    renderReserve(live)
    if (me) {
      me = lookup(me.address) // re-rank the saved address on every refresh
      const summary=document.querySelector('.mission-personal summary')
      if(summary)summary.textContent=me?.kind==='wallet'?`Your wallet · #${me.rank}`:'Find your wallet'
    }
    if (!sim) render(live)
  } catch {
    els.status.dataset.state = 'error'
    els.statusText.textContent = 'cannot reach the chain'
    if (!live) {
      els.lede.textContent =
        'The leaderboard could not be loaded. Nothing is shown rather than showing numbers we cannot verify.'
    }
  }
}

/* ---------- simulation (clearly marked) ---------- */

function stopSim() {
  clearInterval(simTimer)
  clearTimeout(simTimer)
  simTimer = null
  sim = null
  view = 'reserve'
  wheelOffset = 0
  syncViewButtons()
  els.board.dataset.sim = 'false'
  els.simBtn.setAttribute('aria-pressed', 'false')
  els.simBtn.textContent = 'Preview the climb'
  setPose('hold')
  render(live)
}

function startSim() {
  if (!live) return
  sim = structuredClone(live)
  sim.reserve = {
    address: '0x0000000000000000000000000000000000000000',
    deployed: true,
    rank: null,
    xmr: (live.wallets[9]?.xmr ?? 0) * 0.999,
    delta: null,
  }
  els.board.dataset.sim = 'true'
  els.simBtn.setAttribute('aria-pressed', 'true')
  els.simBtn.textContent = 'Stop preview'
  view = 'top'
  wheelOffset = 0
  syncViewButtons()

  const rank = () => {
    const all = [...sim.wallets.map((w) => ({ ...w })), { address: sim.reserve.address, xmr: sim.reserve.xmr }]
    all.sort((a, b) => b.xmr - a.xmr)
    all.forEach((w, i) => (w.rank = i + 1))
    const mine = all.find((w) => w.address === sim.reserve.address)
    const prev = sim.reserve.rank
    sim.reserve.rank = mine.rank
    sim.reserve.delta = prev == null ? null : prev - mine.rank
    sim.wallets = all.filter((w) => w.address !== sim.reserve.address)
    const above = all[mine.rank - 2]
    sim.nextRung = above
      ? {
          rank: mine.rank - 1,
          holderXmr: above.xmr,
          needXmr: Math.max(0, above.xmr - sim.reserve.xmr),
          needUsd: sim.price ? Math.max(0, above.xmr - sim.reserve.xmr) * sim.price.usd : null,
          reached: false,
        }
      : null
    return prev
  }

  rank()
  render(sim)

  simTimer = setInterval(() => {
    const prev = sim.reserve.rank
    const rival = sim.wallets.find(w=>w.rank===prev-1)
    const next = sim.wallets.find(w=>w.rank===prev-2)
    if (!rival) return
    sim.reserve.xmr = next ? (rival.xmr + next.xmr)/2 : rival.xmr + 0.0001
    rank()
    render(sim)

    if (sim.reserve.rank === 1) setPose('crown')
    else if (prev != null && sim.reserve.rank < prev) {
      setPose('overtake')
      setTimeout(() => { if (sim) setPose(sim.reserve.rank === 1 ? 'crown' : 'hold') }, 900)
    } else if (sim.nextRung && sim.nextRung.needXmr < 0.5) setPose('reach')
    else setPose('climb')

    if (sim.reserve.rank === 1) {
      clearInterval(simTimer)
      simTimer = setTimeout(stopSim, 4200)
    }
  }, 1600)
}

els.simBtn.addEventListener('click', () => (sim ? stopSim() : startSim()))

window.addEventListener('track-reserve',()=>{
  if(sim)stopSim()
  view='reserve'
  wheelOffset=0
  syncViewButtons()
  render(data())
})

const wheelControls=document.createElement('div')
wheelControls.className='wheel-controls'
wheelControls.innerHTML='<button type="button" data-step="-1" aria-label="Previous wallet">↑</button><button type="button" data-step="0">Follow reserve</button><button type="button" data-step="1" aria-label="Next wallet">↓</button>'
els.board.after(wheelControls)
els.simBtn.disabled=true
for(const button of wheelControls.querySelectorAll('button'))button.disabled=true
wheelControls.addEventListener('click',e=>{
  const button=e.target.closest('button')
  if (!button) return
  wheelOffset=Number(button.dataset.step)===0 ? 0 : wheelOffset+Number(button.dataset.step)
  if(Number(button.dataset.step)===0){view='reserve';syncViewButtons()}
  render(data())
})

/* ---------- boot ---------- */

setPose('hold')
load().then(() => {
  try {
    const saved = localStorage.getItem(STORE_KEY)
    if (saved && isAddr(saved)) {
      els.addr.value = saved
      setMe(saved, { persist: false, focusView: false })
    }
  } catch {}
})
setInterval(load, REFRESH_MS)
