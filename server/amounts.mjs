import { formatUnits } from 'viem'

// Keep display rounding out of calculations. Rankings still compare raw BigInt.
export const xmrFromRaw = raw => Number(formatUnits(BigInt(raw), 18))
