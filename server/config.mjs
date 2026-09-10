// THE CLIMB - configuration
// Every address here is verified live on Robinhood Chain (4663).
// Nothing in this file is decorative. If a value cannot be sourced, it is null.

export const CHAIN_ID = 4663

export const BLOCKSCOUT = 'https://robinhoodchain.blockscout.com/api/v2'
export const DEXSCREENER = 'https://api.dexscreener.com/latest/dex'

// User-selected Monero-labelled ERC-20 on Robinhood Chain.
// Explorer metadata: name "Monero", symbol XMR, 18 decimals.
// Exact bridge provenance, backing and redemption route remain unverified.
export const XMR = '0x38F728351fd9565087a4fF0ad5049739e0Ce235c'

// Uniswap v4 singleton. Holds pooled XMR for EVERY v4 pair on the chain.
// This is the market, not a wallet. Never ranked.
export const POOL_MANAGER = '0x8366a39CC670B4001A1121B8F6A443A643e40951'

// Our XMR reserve wallet.
// null until the token is deployed. The UI renders a pre-launch state when null.
// DO NOT put a placeholder address here - an unranked truth beats a fake rank.
export const RESERVE_ADDRESS = null

// Refresh cadence. A full holder crawl is 8 paginated calls / ~34s measured,
// so this must never run on the request path.
export const REFRESH_MS = 90_000

export const PORT = 5178
