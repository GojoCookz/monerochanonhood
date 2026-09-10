/* Turn the raw ChatGPT generation into a usable sprite sheet.
 *
 * Raw: 1024x1536, 3 cols x 2 rows, characters in flat magenta.
 *
 * IMPORTANT: do NOT trim each cell to its own bounding box and normalise the
 * heights. That was the first attempt and it is wrong - `slip` is 580px of
 * content and `reach` is 739px, so height-normalising scales them by different
 * factors and the character visibly changes SIZE when the pose swaps.
 * Measured union of all six content boxes is the full 341x768 cell anyway,
 * so there is nothing to gain from cropping.
 *
 * Correct transform: key the magenta to alpha, then apply ONE uniform scale to
 * the whole sheet. Character scale and bar position stay exactly as generated. */

import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'assets', 'sprite-raw.png')
const OUT = path.join(ROOT, 'assets', 'monerochan-climb.png')

const COLS = 3
const ROWS = 2
const CELL_W = 160 // output cell size; aspect must match the source cell
const POSES = ['hold', 'reach', 'climb', 'overtake', 'slip', 'crown']

const KEY = { r: 255, g: 0, b: 255 }
const TOL = 105

const meta = await sharp(SRC).metadata()
const srcCellW = meta.width / COLS
const srcCellH = meta.height / ROWS
const cellAspect = srcCellW / srcCellH
const CELL_H = Math.round(CELL_W / cellAspect)

console.log(`source ${meta.width}x${meta.height}  cell ${srcCellW}x${srcCellH}  aspect ${cellAspect.toFixed(4)}`)

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width, height, channels } = info

let keyed = 0
for (let i = 0; i < width * height; i++) {
  const o = i * channels
  const r = data[o]
  const g = data[o + 1]
  const b = data[o + 2]
  const dist = Math.hypot(r - KEY.r, g - KEY.g, b - KEY.b)
  if (dist < TOL) {
    data[o + 3] = 0
    keyed++
  } else if (dist < TOL * 1.7) {
    // Feather the rim, and pull the magenta out of the surviving edge pixels
    // so there is no pink halo against the near-black page.
    const t = (dist - TOL) / (TOL * 0.7)
    data[o + 3] = Math.round(data[o + 3] * t)
    const k = (1 - t) * 0.6
    data[o] = Math.round(r * (1 - k))
    data[o + 2] = Math.round(b * (1 - k))
  }
}
console.log(`keyed ${((keyed / (width * height)) * 100).toFixed(1)}% of pixels to transparent`)

await sharp(data, { raw: { width, height, channels } })
  .resize({ width: CELL_W * COLS, height: CELL_H * ROWS, fit: 'fill' })
  .png({ compressionLevel: 9 })
  .toFile(OUT)

const outMeta = await sharp(OUT).metadata()
console.log(`\nwrote ${path.relative(ROOT, OUT)}  ${outMeta.width}x${outMeta.height}`)
console.log(`cell ${CELL_W}x${CELL_H}  aspect ${(CELL_W / CELL_H).toFixed(4)}`)
console.log(`\nCSS needs:  background-size: ${COLS * 100}% ${ROWS * 100}%`)
console.log(`element aspect-ratio: ${CELL_W} / ${CELL_H}`)
POSES.forEach((p, i) => {
  const x = COLS === 1 ? 0 : ((i % COLS) / (COLS - 1)) * 100
  const y = ROWS === 1 ? 0 : (Math.floor(i / COLS) / (ROWS - 1)) * 100
  console.log(`  ${p.padEnd(9)} background-position: ${x}% ${y}%`)
})
