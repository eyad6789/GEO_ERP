// Simple unique id + timestamp helpers for the backend (server runtime — Date is allowed here).
let counter = 0

export function genId(prefix = 'id'): string {
  counter = (counter + 1) % 100000
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${Date.now().toString(36)}-${counter}-${rand}`
}

export function nowISO(): string {
  return new Date().toISOString()
}
