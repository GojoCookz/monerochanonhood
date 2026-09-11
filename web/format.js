export function formatUsd(value) {
  if (value == null || !Number.isFinite(value)) return '—'
  if (value > 0 && value < 0.01) return '<$0.01'
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value)
}
