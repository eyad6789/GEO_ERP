import { useMemo } from 'react'
import { FileText, Printer } from 'lucide-react'
import { Dialog, Button, LoadingState } from '../../components/ui'
import { StatusBadge } from '../../components/shared'
import { useApi, useResource } from '../../hooks/useResource'
import { useLang, useT } from '../../context/LangContext'
import { formatCurrency, formatDate, pickName } from '../../lib/format'
import type { Account } from '../../types'
import type { JournalEntryFull } from './shared'
import { printJournalEntry } from './printEntry'

export function EntryViewDialog({
  entryId,
  onClose,
}: {
  entryId: string | null
  onClose: () => void
}) {
  const t = useT()
  const { lang } = useLang()
  const { data, loading } = useApi<JournalEntryFull>(
    entryId ? `/journal_entries/${entryId}/full` : null,
  )
  const { data: accounts } = useResource<Account>('accounts')
  const accMap = useMemo(() => {
    const m: Record<string, Account> = {}
    for (const a of accounts) m[a.code] = a
    return m
  }, [accounts])

  const currency = data?.currency || 'IQD'

  return (
    <Dialog
      open={!!entryId}
      onClose={onClose}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          {t('accounting.entry.title')}
        </span>
      }
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <Button variant="outline" onClick={() => data && printJournalEntry(data, accMap, lang)} disabled={!data}>
            <Printer className="h-4 w-4" />
            {t('accounting.entry.print')}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      }
    >
      {loading || !data ? (
        <LoadingState label={t('common.loading')} />
      ) : (
        <div className="space-y-5">
          {/* Header summary */}
          <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl bg-slate-50 p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-primary">
                  {data.serial_number}
                </span>
                <StatusBadge status={data.status} />
              </div>
              <p className="text-sm text-slate-600">{data.description || '—'}</p>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <dt className="text-slate-400">{t('accounting.journal.doc')}</dt>
              <dd className="font-medium text-slate-700">{data.doc_number || '—'}</dd>
              <dt className="text-slate-400">{t('common.date')}</dt>
              <dd className="font-medium text-slate-700">{formatDate(data.date, lang)}</dd>
              <dt className="text-slate-400">{t('accounting.entry.currency')}</dt>
              <dd className="font-medium text-slate-700">{data.currency}</dd>
            </dl>
          </div>

          {/* Lines */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-700">
              {t('accounting.entry.lines')}
            </h4>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 text-start">{t('accounting.entry.account')}</th>
                    <th className="px-4 py-2.5 text-start">{t('common.description')}</th>
                    <th className="w-32 px-4 py-2.5 text-end">{t('accounting.journal.debit')}</th>
                    <th className="w-32 px-4 py-2.5 text-end">{t('accounting.journal.credit')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.lines.map((l) => (
                    <tr key={l.id} className="hover:bg-primary/5">
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs text-slate-400">{l.account_code}</span>{' '}
                        <span className="text-slate-700">{pickName(accMap[l.account_code], lang)}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{l.description || '—'}</td>
                      <td className="px-4 py-2.5 text-end tabular-nums text-emerald-700">
                        {l.debit ? formatCurrency(l.debit, currency, lang) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-end tabular-nums text-sky-700">
                        {l.credit ? formatCurrency(l.credit, currency, lang) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-semibold text-slate-700">
                  <tr>
                    <td className="px-4 py-2.5" colSpan={2}>
                      {t('common.total')}
                    </td>
                    <td className="px-4 py-2.5 text-end tabular-nums text-emerald-700">
                      {formatCurrency(data.total_debit, currency, lang)}
                    </td>
                    <td className="px-4 py-2.5 text-end tabular-nums text-sky-700">
                      {formatCurrency(data.total_credit, currency, lang)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  )
}
