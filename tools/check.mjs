import fs from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import sharp from 'sharp'

let checked = 0
for (const dir of ['web', 'server', 'tools']) {
  for (const file of await fs.readdir(dir)) {
    if (!/\.(?:mjs|js)$/.test(file)) continue
    const name = path.join(dir, file)
    const result = spawnSync(process.execPath, ['--check', name], { encoding: 'utf8' })
    if (result.status !== 0) throw new Error(`Syntax check failed: ${name}\n${result.stderr}`)
    checked++
  }
}
const html = await fs.readFile('web/index.html', 'utf8')
let resources = 0
for (const [, url] of html.matchAll(/(?:src|href)="(\/[^"#]+)"/g)) {
  const file = url.startsWith('/assets/') ? url.slice(1) : path.join('web', url.slice(1))
  await fs.access(file)
  resources++
}
const manifest = JSON.parse(await fs.readFile('grab and go/manifest.json', 'utf8'))
if (manifest.length !== 10) throw new Error('Expected ten image exports')
for (const entry of manifest) {
  const meta = await sharp(path.join('grab and go', entry.file)).metadata()
  if (meta.width !== entry.width || meta.height !== entry.height) {
    throw new Error(`Image dimensions do not match manifest: ${entry.file}`)
  }
}
console.log(`PASS: ${checked} JavaScript syntax checks, ${resources} local HTML resources, 10 image export dimensions`)
