import { db } from '../db/connection.js'
import { genId, nowISO } from './ids.js'

export interface LogInput {
  module: string
  action: string
  record_type: string
  record_id: string
  record_description?: string
  company_id?: string | null
  status?: string
  old_values?: unknown
  new_values?: unknown
}

const stmt = db.prepare(`
  INSERT INTO event_logs (
    id, timestamp, user_name, user_role, company_id, module, action,
    record_type, record_id, record_description, ip_address, device, browser,
    status, old_values, new_values, error_message
  ) VALUES (
    @id, @timestamp, @user_name, @user_role, @company_id, @module, @action,
    @record_type, @record_id, @record_description, @ip_address, @device, @browser,
    @status, @old_values, @new_values, @error_message
  )
`)

/** Append an immutable audit-log row. Called by mutation handlers. */
export function logEvent(input: LogInput): void {
  try {
    stmt.run({
      id: genId('log'),
      timestamp: nowISO(),
      user_name: 'أحمد المدير',
      user_role: 'super_admin',
      company_id: input.company_id ?? null,
      module: input.module,
      action: input.action,
      record_type: input.record_type,
      record_id: input.record_id,
      record_description: input.record_description ?? '',
      ip_address: '192.168.1.10',
      device: 'Desktop',
      browser: 'Chrome',
      status: input.status ?? 'SUCCESS',
      old_values: input.old_values ? JSON.stringify(input.old_values) : null,
      new_values: input.new_values ? JSON.stringify(input.new_values) : null,
      error_message: null,
    })
  } catch {
    // logging must never break the request
  }
}
