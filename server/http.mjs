import { Impit } from 'impit'

// Verified against the installed impit 0.14.5 API. Browser-compatible TLS plus
// an explicit JSON/identity response avoids the explorer's 403/500 responses.
// No PowerShell process or local machine is needed by the deployed function.
const explorer = new Impit({
  browser: 'chrome',
  timeout: 20_000,
  headers: { Accept: 'application/json', 'Accept-Encoding': 'identity' },
})

export async function getJson(url, { tries = 3, timeoutSec = 20 } = {}) {
  let lastError
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      const isExplorer = new URL(url).hostname === 'robinhoodchain.blockscout.com'
      const response = isExplorer
        ? await explorer.fetch(url, { timeout: timeoutSec * 1000 })
        : await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(timeoutSec * 1000) })
      if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`)
      return await response.json()
    } catch (error) {
      lastError = error
      if (attempt < tries - 1) await new Promise(resolve => setTimeout(resolve, 900 * (attempt + 1)))
    }
  }
  throw lastError
}
