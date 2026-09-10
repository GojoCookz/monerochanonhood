import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createSnapshotCache } from '../server/cached-snapshot.mjs'
import { parseReserveBalance } from '../server/reserve.mjs'
import { XMR } from '../server/config.mjs'

test('reserve balance matches the contract address rather than ticker', () => {
  assert.equal(parseReserveBalance([
    { token: { address_hash: '0x0000000000000000000000000000000000000001', symbol: 'XMR' }, value: '999' },
    { token: { address_hash: XMR.toLowerCase() }, value: '123456789' },
  ]), '123456789')
})

test('empty successful balance list means zero; malformed response is not zero', () => {
  assert.equal(parseReserveBalance([]), '0')
  assert.throws(() => parseReserveBalance({ error: 'offline' }), /Invalid reserve/)
  assert.throws(() => parseReserveBalance([{ token: { address_hash: XMR }, value: 'invalid' }]), /Invalid reserve/)
})

test('concurrent cold requests share one crawl and no filesystem persistence', async () => {
  let calls = 0
  const get = createSnapshotCache(async options => {
    calls++
    assert.equal(options.persist, false)
    return { takenAt: 'original-time', index: [] }
  })
  const values = await Promise.all([get(), get(), get()])
  assert.equal(calls, 1)
  assert.equal(values[0].snapshot, values[2].snapshot)
  await get()
  assert.equal(calls, 1)
})

test('failed refresh retains last genuine snapshot timestamp', async () => {
  let clock = 0, calls = 0
  const get = createSnapshotCache(async () => {
    if (++calls > 1) throw new Error('offline')
    return { takenAt: 'unchanged' }
  }, { ttl: 10, now: () => clock })
  await get()
  clock = 11
  const result = await get()
  assert.equal(result.stale, true)
  assert.equal(result.snapshot.takenAt, 'unchanged')
})

test('cold upstream failure does not invent a snapshot', async () => {
  const get = createSnapshotCache(async () => { throw new Error('offline') })
  await assert.rejects(get(), /offline/)
})

test('deployment output contains the page and its local resources', async () => {
  const html = await fs.readFile('dist/index.html', 'utf8')
  for (const [, url] of html.matchAll(/(?:src|href)="(\/[^"#]+)"/g)) {
    await fs.access('dist' + url)
  }
  for (const file of ['monerochan-climb.png','monerochan-perch-raw.png','monerochan-guardian.webp','monerochan-presenter.webp','monerochan-inspector.webp','monerochan-umbrella.png']) {
    await fs.access('dist/assets/' + file)
  }
})
