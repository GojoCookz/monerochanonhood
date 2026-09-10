# Monerochan on Hood

An interactive, pre-launch XMR treasury concept for Robinhood Chain. The interface includes Reserve, The Climb and Dividends screens, character artwork, a compact holder leaderboard and an illustrative dividend calculator.

## The shared Climb

The entrance frames a shared mission: one community following its reserve toward the top of the selected XMR holder board. Opening the world centres the reserve; personal wallet lookup remains a separate, preserved view.

Checkpoints (listed, top 10, top 3, first place) come from the current reserve rank. They can become incomplete again if rank falls. A goal is not a claim that it has been reached. Motion previews remain labelled simulation and never change the live mission panel or journal.

The expedition journal stores up to 20 changed balance/rank observations in this browser's local storage. It is device-local, not a shared event index or transaction proof. Clearing it offers an undo. The dividend calculator, artwork, background rain, umbrella reveal, market sources and five-row wallet wheel remain available.

## Run locally

Requires Node.js 20 or later and npm. Explorer requests use the cross-platform `impit` client; no PowerShell process is required.

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

## Vercel deployment

`vercel.json` runs `npm run build` and serves the frozen `dist/` output. `api/climb.js` is a Node serverless function sharing the same snapshot builder as the local server. It does not depend on a local background process or write into the deployment filesystem.

The function combines concurrent requests into one crawl, caches successful results in its warm instance, and sets CDN cache headers. A cold request may wait for the explorer crawl. Warm-instance history is temporary; this is not a durable historical index. A failed warm refresh keeps the previous timestamp; a failed cold crawl returns 503 rather than inventing data.

```sh
npm run build
npm test
```

Current production project: `gojocookzs-projects/monerochanonhood-uhfm`.
Direct project URL: https://monerochanonhood-uhfm.vercel.app/
Custom domain: https://www.monerochan.world/ (apex redirects to www).

Both `monerochan.world` and `www.monerochan.world` are verified on this project. Namecheap is the DNS provider. At verification, public DNS returned apex A `216.198.79.1` and www CNAME `b3d55111ea8e7c15.vercel-dns-017.com`. Use the project's Vercel domain settings as the authority for future DNS changes. A router may retain an earlier negative answer even after public DNS is correct; the direct project URL is an independent fallback.

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

Project reserve wallet: `0x25D58Dcf6510F5D91a7De0f5246d6D9E74CD8fb1`. The API reads its selected-XMR token balance and account type from the explorer. A successful empty token-balance response is zero; a failed request is unavailable. The address was supplied by the project owner; multisig custody has not been established.

Project token and distributor addresses have not been supplied. Consequently:

- Reserve holdings are connected; project trading/payout totals remain explicitly unconnected.
- No token trading, custody or dividend distribution contracts are deployed by this repository.
- The animated climb preview is labelled simulation.
- The dividend calculator uses user-editable illustrative inputs, not promised returns.

Proposed fees are 3% on buys and sells, with 1% originally designated for the reserve. A 1.5% dividend allocation was discussed, but the final split, eligibility and payout mechanics remain unconfirmed.

## Verification

`npm run check` validates JavaScript syntax, required local page resources and the ten exported image dimensions. This is a publication sanity check, not comprehensive automated UI coverage or a contract security audit.

Browser interaction checks performed during development covered screen navigation, address lookup, leaderboard view switching, five-row simulation progression, calculator updates, disclosure controls and the umbrella reveal. Machine-specific browser scripts, screenshots, runtime logs and cached market data are excluded from Git.

## Artwork

New artwork was generated through ChatGPT using the supplied Monerochan reference. Brand scenes are fictional illustrations, not evidence of treasury holdings, payouts or official partnerships. No affiliation with Strategy, Robinhood, Monero, Hyperliquid or Wormhole is claimed.
