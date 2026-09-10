import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/**
 * Robinhood Chain's Blockscout sits behind Cloudflare bot protection that
 * blocks on TLS fingerprint, not on headers. Measured on this box:
 *
 *   node fetch (undici) -> 403
 *   node https module   -> 403
 *   node http2          -> 403
 *   curl.exe            -> 403
 *   PowerShell IRM      -> 200      <- .NET HttpClient over Schannel
 *
 * Changing the User-Agent does nothing. So on Windows we shell out to
 * PowerShell for the request and parse the body here.
 *
 * DEPLOYMENT NOTE: this is a real constraint, not a local quirk. A Linux host
 * running plain node fetch will very likely get the same 403, so the crawler
 * needs a fingerprint-preserving client (curl-impersonate) or a proxy before
 * this ships anywhere that is not this machine.
 */
const USE_POWERSHELL = process.platform === 'win32'

function psEncode(script) {
  return Buffer.from(script, 'utf16le').toString('base64')
}

async function getViaPowerShell(url, timeoutSec) {
  const safeUrl = url.replace(/'/g, "''")
  const script = [
    '$ProgressPreference = "SilentlyContinue"',
    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
    `$r = Invoke-WebRequest -Uri '${safeUrl}' -UseBasicParsing -TimeoutSec ${timeoutSec}`,
    '[Console]::Out.Write($r.Content)',
  ].join('\n')

  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-EncodedCommand', psEncode(script)],
    { maxBuffer: 32 * 1024 * 1024, timeout: (timeoutSec + 10) * 1000 },
  )
  return JSON.parse(stdout)
}

async function getViaFetch(url, timeoutSec) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutSec * 1000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getJson(url, { tries = 3, timeoutSec = 30 } = {}) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try {
      return USE_POWERSHELL
        ? await getViaPowerShell(url, timeoutSec)
        : await getViaFetch(url, timeoutSec)
    } catch (err) {
      lastErr = err
      if (i < tries - 1) await new Promise((r) => setTimeout(r, 900 * (i + 1)))
    }
  }
  throw lastErr
}
