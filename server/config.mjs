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

// Project-supplied reserve wallet, published by the owner in this project thread.
// This config does not assert multisig custody or a deployed dividend contract.
export const RESERVE_ADDRESS = '0x25D58Dcf6510F5D91a7De0f5246d6D9E74CD8fb1'

// Refresh cadence. A full holder crawl is 8 paginated calls / ~34s measured,
// so this must never run on the request path.
export const REFRESH_MS = 90_000

export const PORT = 5178
