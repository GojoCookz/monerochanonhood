export function createSnapshotCache(collect, { ttl = 90_000, now = Date.now } = {}) {
  let latest = null
  let refreshed = 0
  let inFlight = null
  return async function getSnapshot() {
    if (latest && now() - refreshed < ttl) return { snapshot: latest, stale: false }
    if (!inFlight) {
      inFlight = collect({ persist: false, previous: latest }).then(snapshot => {
        latest = snapshot
        refreshed = now()
        return { snapshot, stale: false }
      }).catch(error => {
        if (latest) return { snapshot: latest, stale: true }
        throw error
      }).finally(() => { inFlight = null })
    }
    return inFlight
  }
}
