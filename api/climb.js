import { buildSnapshot } from '../server/snapshot.mjs'
import { createSnapshotCache } from '../server/cached-snapshot.mjs'

const getSnapshot = createSnapshotCache(buildSnapshot)

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }
  try {
    const { snapshot, stale } = await getSnapshot()
    res.setHeader('Cache-Control', stale ? 'public, max-age=0, s-maxage=15' : 'public, max-age=0, s-maxage=90, stale-while-revalidate=180')
    res.setHeader('X-Snapshot-State', stale ? 'stale' : 'fresh')
    return res.status(200).json(snapshot)
  } catch (error) {
    console.error('[climb] upstream snapshot failed:', error.message)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(503).json({ success: false, error: 'The holder source is temporarily unavailable. Please retry shortly.' })
  }
}
