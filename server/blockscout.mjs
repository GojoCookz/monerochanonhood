import { BLOCKSCOUT, DEXSCREENER, XMR, POOL_MANAGER } from './config.mjs'
import { getJson } from './http.mjs'

/**
 * Walk every page of the XMR holder list.
 * Measured: 8 pages / 363 holders / ~34s. Background job only.
 */
export async function fetchAllHolders() {
  const out = []
  let url = `${BLOCKSCOUT}/tokens/${XMR}/holders`
  let pages = 0

  while (url && pages < 25) {
    const page = await getJson(url)
    for (const item of page.items ?? []) {
      out.push({
        address: item.address?.hash,
        label: item.address?.name ?? null,
        raw: item.value,
      })
    }
    pages++
    const next = page.next_page_params
    if (!next) break
    const qs = new URLSearchParams(
      Object.entries(next).map(([k, v]) => [k, String(v)]),
    ).toString()
    url = `${BLOCKSCOUT}/tokens/${XMR}/holders?${qs}`
  }

  return { holders: out, pages }
}

/**
 * Every DEX pair that quotes against XMR. These contracts hold XMR as
 * inventory, not as a position, so they are excluded from the wallet ranking.
 * The page states this rule out loud - a silent exclusion is a cherry-pick.
 */
export async function fetchMarketAddresses() {
  const market = new Map()
  market.set(POOL_MANAGER.toLowerCase(), 'Uniswap v4 PoolManager')

  try {
    const data = await getJson(`${DEXSCREENER}/tokens/${XMR}`)
    for (const pair of data?.pairs ?? []) {
      const addr = pair.pairAddress
      // v4 pairs report a 32-byte pool id, not an address. Only 20-byte
      // addresses can appear in a holder list, so only those can be excluded.
      if (typeof addr === 'string' && /^0x[0-9a-fA-F]{40}$/.test(addr)) {
        const name = `${pair.baseToken?.symbol ?? '?'}/${pair.quoteToken?.symbol ?? '?'} pool`
        market.set(addr.toLowerCase(), name)
      }
    }
  } catch {
    // DexScreener down: we still exclude the PoolManager, and the payload
    // reports marketSource so the UI can say the list may be incomplete.
    return { market, marketSource: 'poolmanager-only' }
  }

  return { market, marketSource: 'full' }
}

export async function fetchXmrPriceUsd() {
  try {
    const data = await getJson(`${DEXSCREENER}/tokens/${XMR}`)
    const priced = (data?.pairs ?? [])
      .filter((p) => p.baseToken?.address?.toLowerCase() === XMR.toLowerCase())
      .filter((p) => Number(p.priceUsd) > 0 && Number(p.liquidity?.usd) > 0)
    if (!priced.length) return null
    // Liquidity-weighted, so a $0.92 pool cannot move the number.
    const totalLiq = priced.reduce((s, p) => s + Number(p.liquidity.usd), 0)
    const weighted = priced.reduce(
      (s, p) => s + Number(p.priceUsd) * Number(p.liquidity.usd),
      0,
    )
    return {
      usd: weighted / totalLiq,
      pools: priced.length,
      basis: 'liquidity-weighted across XMR-base pools on Robinhood Chain',
    }
  } catch {
    return null
  }
}
