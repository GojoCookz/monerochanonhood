import { BLOCKSCOUT, RESERVE_ADDRESS, XMR } from './config.mjs'
import { getJson } from './http.mjs'

export function parseReserveBalance(balances) {
  if (!Array.isArray(balances)) throw new Error('Invalid reserve balance response')
  const token = balances.find(item => (item.token?.address_hash ?? item.token?.address ?? '').toLowerCase() === XMR.toLowerCase())
  const raw = token?.value ?? '0'
  if (!/^\d+$/.test(raw)) throw new Error('Invalid reserve token balance')
  return String(raw)
}

export async function fetchReserveState() {
  if (!RESERVE_ADDRESS) return { raw: null, accountType: 'unknown', checkedAt: null }
  const [balances, account] = await Promise.allSettled([
    getJson(`${BLOCKSCOUT}/addresses/${RESERVE_ADDRESS}/token-balances`),
    getJson(`${BLOCKSCOUT}/addresses/${RESERVE_ADDRESS}`),
  ])
  let raw = null
  if (balances.status === 'fulfilled') {
    try { raw = parseReserveBalance(balances.value) } catch { /* Unknown is not zero. */ }
  }
  const isContract = account.status === 'fulfilled' ? account.value.is_contract : undefined
  return {
    raw,
    accountType: isContract === true ? 'contract' : isContract === false ? 'wallet' : 'unknown',
    checkedAt: raw === null ? null : new Date().toISOString(),
  }
}
