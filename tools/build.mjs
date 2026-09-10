import fs from 'node:fs/promises'
import path from 'node:path'

// Vercel serves this frozen output, not the repository root or local server.
await fs.rm('dist', { recursive: true, force: true })
await fs.mkdir('dist/assets/ref', { recursive: true })
await fs.cp('web', 'dist', { recursive: true })
for (const name of await fs.readdir('assets')) {
  if (/\.(png|webp|svg|jpg)$/.test(name)) {
    await fs.copyFile(path.join('assets', name), path.join('dist/assets', name))
  }
}
await fs.copyFile('assets/ref/monerochan-ref.webp', 'dist/assets/ref/monerochan-ref.webp')
console.log('Built dist/index.html, web modules/styles and website artwork')
