import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { fetchAllHolders, fetchMarketAddresses, fetchXmrPriceUsd } from './blockscout.mjs'
import { RESERVE_ADDRESS, XMR } from './config.mjs'
import { fetchReserveState } from './reserve.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA = path.join(ROOT, 'data')
const LATEST = path.join(DATA, 'latest.json')
const HISTORY = path.join(DATA, 'history.json')

const WEI = 10n ** 18n

/** exact 18-dec -> number, for display only. All ranking is done on BigInt. */
function toXmr(raw) {
  const v = BigInt(raw)
  return Number((v * 10_000n) / WEI) / 10_000
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {
    return fallback
  }
}

export async function buildSnapshot({ persist = true, previous = null } = {}) {
  const startedAt = Date.now()

  const [{ holders, pages }, { market, marketSource }, price, reserveState] = await Promise.all([
    fetchAllHolders(),
    fetchMarketAddresses(),
    fetchXmrPriceUsd(),
    fetchReserveState(),
  ])

  const wallets = []
  const pools = []

  for (const h of holders) {
    if (!h.address) continue
    const key = h.address.toLowerCase()
    const entry = {
      address: h.address,
      raw: h.raw,
      xmr: toXmr(h.raw),
      label: h.label ?? market.get(key) ?? null,
    }
    if (market.has(key)) pools.push({ ...entry, label: market.get(key) })
    else wallets.push(entry)
  }

  // Rank on BigInt so two near-identical balances never tie by float rounding.
  wallets.sort((a, b) => (BigInt(b.raw) > BigInt(a.raw) ? 1 : BigInt(b.raw) < BigInt(a.raw) ? -1 : 0))
  wallets.forEach((w, i) => {
    w.rank = i + 1
  })

  const prev = persist ? await readJson(LATEST, null) : previous
  const prevRanks = new Map(
    (prev?.wallets ?? []).map((w) => [w.address.toLowerCase(), w.rank]),
  )
  for (const w of wallets) {
    const before = prevRanks.get(w.address.toLowerCase())
    // A rank delta only exists if we actually observed this wallet before.
    // No prior observation means no arrow. We do not invent movement.
    w.delta = before == null ? null : before - w.rank
  }

  const reserveKey = RESERVE_ADDRESS?.toLowerCase() ?? null
  const us = reserveKey ? wallets.find((w) => w.address.toLowerCase() === reserveKey) ?? null : null

  // Cost of each rung, priced today. Works before we hold anything.
  const rungFor = (targetRank) => {
    const occupant = wallets[targetRank - 1]
    if (!occupant) return null
    const need = BigInt(occupant.raw) - BigInt(us?.raw ?? 0)
    const needXmr = need > 0n ? toXmr(need.toString()) : 0
    return {
      rank: targetRank,
      holderXmr: occupant.xmr,
      needXmr,
      needUsd: price ? needXmr * price.usd : null,
      reached: need <= 0n,
    }
  }

  const poolTotal = pools.reduce((s, p) => s + BigInt(p.raw), 0n)
  const walletTotal = wallets.reduce((s, w) => s + BigInt(w.raw), 0n)

  const snapshot = {
    schema: 2,
    takenAt: new Date().toISOString(),
    crawlMs: Date.now() - startedAt,
    source: {
      holders: 'robinhoodchain.blockscout.com/api/v2',
      pricing: price?.basis ?? null,
      marketExclusions: marketSource,
      pagesCrawled: pages,
    },
    token: { address: XMR, symbol: 'XMR', name: 'Monero', chainId: 4663 },
    price,
    totals: {
      holderRows: holders.length,
      wallets: wallets.length,
      pools: pools.length,
      walletXmr: toXmr(walletTotal.toString()),
      poolXmr: toXmr(poolTotal.toString()),
      walletsAboveOne: wallets.filter((w) => BigInt(w.raw) >= WEI).length,
      walletsAbovePointOne: wallets.filter((w) => BigInt(w.raw) >= WEI / 10n).length,
    },
    reserve: {
      address: RESERVE_ADDRESS,
      deployed: Boolean(RESERVE_ADDRESS),
      rank: us?.rank ?? null,
      xmr: reserveState.raw !== null ? toXmr(reserveState.raw) : us?.xmr ?? null,
      raw: reserveState.raw ?? us?.raw ?? null,
      accountType: reserveState.accountType,
      balanceCheckedAt: reserveState.checkedAt,
      balanceSource: reserveState.raw !== null ? 'explorer-token-balances' : us ? 'holder-snapshot' : null,
      delta: us?.delta ?? null,
    },
    // The gap to the rung directly above us is the call to action.
    nextRung: us ? rungFor(us.rank - 1) : rungFor(wallets.length >= 10 ? 10 : wallets.length),
    ladder: [1, 3, 5, 10].map(rungFor).filter(Boolean),
    wallets: wallets.slice(0, 40),
    // Every wallet, compact, so "where am I" is an instant client-side lookup
    // instead of another round trip per visitor. 350 rows is ~15 KB gzipped.
    // Tuple form [addressLower, rank, xmr] - object keys would triple it.
    index: wallets.map((w) => [w.address.toLowerCase(), w.rank, w.xmr]),
    // Lets the UI tell someone "that address is a liquidity pool, not a wallet"
    // instead of silently reporting them as unranked.
    poolIndex: pools.map((p) => [p.address.toLowerCase(), p.label ?? 'pool', p.xmr]),
    pools: pools.sort((a, b) => b.xmr - a.xmr).slice(0, 5),
  }

  if (!persist) return snapshot

  await fs.mkdir(DATA, { recursive: true })
  await fs.writeFile(LATEST, JSON.stringify(snapshot, null, 2))

  const history = await readJson(HISTORY, [])
  history.push({
    takenAt: snapshot.takenAt,
    reserveRank: snapshot.reserve.rank,
    reserveXmr: snapshot.reserve.xmr,
    walletCount: wallets.length,
    priceUsd: price?.usd ?? null,
  })
  await fs.writeFile(HISTORY, JSON.stringify(history.slice(-2000), null, 2))

  return snapshot
}

// pathToFileURL, not string concat: on Windows argv[1] is "C:\..." and
// import.meta.url is "file:///C:/...", so a hand-rolled compare never matches.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildSnapshot()
    .then((s) => {
      console.log(`crawled ${s.source.pagesCrawled} pages in ${s.crawlMs}ms`)
      console.log(`wallets=${s.totals.wallets} pools=${s.totals.pools} >=1 XMR: ${s.totals.walletsAboveOne}`)
      console.log(`XMR price: ${s.price ? '$' + s.price.usd.toFixed(2) : 'unavailable'}`)
      console.log('top 5:')
      for (const w of s.wallets.slice(0, 5)) console.log(`  #${w.rank} ${w.address} ${w.xmr} XMR`)
      console.log('pools excluded:')
      for (const p of s.pools) console.log(`  ${p.label} ${p.xmr} XMR`)
    })
    .catch((e) => {
      console.error('snapshot failed:', e)
      process.exit(1)
    })
}
