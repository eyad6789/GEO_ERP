// Document number generator: [MODULE]-[COMPANY]-[YEAR]-[SEQUENCE]
// e.g. JV-C01-2026-0042

export function makeDocNumber(
  modulePrefix: string,
  companyCode: string,
  sequence: number,
  year = new Date().getFullYear(),
): string {
  const seq = String(sequence).padStart(4, '0')
  return `${modulePrefix}-${companyCode}-${year}-${seq}`
}

export function makeSerial(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(6, '0')}`
}
