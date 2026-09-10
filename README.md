# Monerochan on Hood

An interactive, pre-launch XMR treasury concept for Robinhood Chain. The interface includes Reserve, The Climb and Dividends screens, character artwork, a compact holder leaderboard and an illustrative dividend calculator.

## Run locally

Requires Node.js 20 or later and npm. The current market-data transport uses Windows PowerShell on Windows. On other systems it uses Node fetch; explorer access must be tested on the intended host.

```sh
npm ci
npm run check
kimaki tunnel -- npm start
```

The server listens on port 5178. Kimaki provides the public review URL. The background crawler writes its first snapshot to `data/`; until that completes, the leaderboard API reports unavailable. Existing good snapshots are retained if a refresh fails.

```sh
npm run snapshot
npm run art:export
```

`snapshot` runs a one-off market-data refresh. `art:export` recreates the ten delivery images and a contact sheet from the preserved raw artwork.

## Included

- `web/` — app screens, mobile navigation, five-row holder wheel, wallet lookup, calculator and decorative rain.
- `server/` — cached Blockscout holder crawler, known-pool filtering and HTTP endpoints.
- `assets/` — reference, generated website artwork and raw promotional artwork.
- `grab and go/` — ten ready-to-use PNG exports, format notes and an image manifest.
- `tools/` — asset processing, export and repository checks.

The image pack contains a **500 × 500 profile picture**, a **1500 × 500 banner**, and **eight 1080 × 1080 promotional illustrations**.

## Data and current state

The selected pair asset is the ERC-20 at `0x38F728351fd9565087a4fF0ad5049739e0Ce235c` on Robinhood Chain (4663). Its exact backing and redemption route have not been independently verified here.

The leaderboard uses paginated explorer snapshots and filters known liquidity-pool addresses found in a DEX listing. It is not a block-atomic snapshot or a complete classification of every contract, and it is not a leaderboard of native Monero holders. USD figures are reference estimates, not executable quotes.

Project token, reserve and distributor addresses have not been supplied. Consequently:

- Reserve holdings and project trading/payout totals remain explicitly unconnected.
- No token trading, custody or dividend distribution contracts are deployed by this repository.
- The animated climb preview is labelled simulation.
- The dividend calculator uses user-editable illustrative inputs, not promised returns.

Proposed fees are 3% on buys and sells, with 1% originally designated for the reserve. A 1.5% dividend allocation was discussed, but the final split, eligibility and payout mechanics remain unconfirmed.

## Verification

`npm run check` validates JavaScript syntax, required local page resources and the ten exported image dimensions. This is a publication sanity check, not comprehensive automated UI coverage or a contract security audit.

Browser interaction checks performed during development covered screen navigation, address lookup, leaderboard view switching, five-row simulation progression, calculator updates, disclosure controls and the umbrella reveal. Machine-specific browser scripts, screenshots, runtime logs and cached market data are excluded from Git.

## Artwork

New artwork was generated through ChatGPT using the supplied Monerochan reference. Brand scenes are fictional illustrations, not evidence of treasury holdings, payouts or official partnerships. No affiliation with Strategy, Robinhood, Monero, Hyperliquid or Wormhole is claimed.
