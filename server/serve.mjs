import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSnapshot } from './snapshot.mjs'
import { PORT, REFRESH_MS } from './config.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const WEB = path.join(ROOT, 'web')
const DATA = path.join(ROOT, 'data')

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

let refreshing = false

async function refresh() {
  if (refreshing) return
  refreshing = true
  try {
    const s = await buildSnapshot()
    console.log(`[climb] snapshot ok  wallets=${s.totals.wallets} crawl=${s.crawlMs}ms`)
  } catch (e) {
    // Never overwrite good data with a failure. The served file keeps its
    // old takenAt, and the UI shows how stale it is.
    console.error('[climb] snapshot FAILED, serving last good:', e.message)
  } finally {
    refreshing = false
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  if (url.pathname === '/api/climb') {
    try {
      const body = await fs.readFile(path.join(DATA, 'latest.json'), 'utf8')
      res.writeHead(200, { 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-store' })
      return res.end(body)
    } catch {
      res.writeHead(503, { 'Content-Type': TYPES['.json'] })
      return res.end(JSON.stringify({ error: 'no snapshot yet' }))
    }
  }

  if (url.pathname === '/api/history') {
    try {
      const body = await fs.readFile(path.join(DATA, 'history.json'), 'utf8')
      res.writeHead(200, { 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-store' })
      return res.end(body)
    } catch {
      res.writeHead(200, { 'Content-Type': TYPES['.json'] })
      return res.end('[]')
    }
  }

  let rel = url.pathname === '/' ? '/index.html' : url.pathname
  let base = WEB
  if (rel.startsWith('/assets/')) {
    base = ROOT
  }
  const filePath = path.join(base, rel)
  if (!filePath.startsWith(base)) {
    res.writeHead(403)
    return res.end('forbidden')
  }

  try {
    const buf = await fs.readFile(filePath)
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    res.end(buf)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('not found')
  }
})

server.listen(PORT, () => {
  console.log(`[climb] http://localhost:${PORT}`)
  refresh()
  setInterval(refresh, REFRESH_MS)
})
