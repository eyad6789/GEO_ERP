import { useRef, useState, type ReactNode } from 'react'
import { ChevronRight, ArrowLeftRight, Boxes, Camera, Pencil, Check, X } from 'lucide-react'
import { Dialog, Badge, Button, LoadingState, useToast } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { useApi, useResource } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { formatNumber, pickName } from '../../lib/format'
import { cn } from '../../lib/cn'
import { apiPost } from '../../lib/api'
import type { Item, Warehouse } from '../../types'
import {
  categoryLabel,
  subCategoryLabel,
  WAREHOUSE_TYPE_COLOR,
  CONDITION_COLOR,
  type CategoryDef,
  type ItemDetailResponse,
  type ItemCondition,
} from './helpers'
import { categoryMeta } from './categoryMeta'
import { MovementTimeline } from './ItemJourney'

export function ItemDetailDialog({ itemId, onClose }: { itemId: string | null; onClose: () => void }) {
  const t = useT()
  const { lang } = useLang()
  const toast = useToast()

  const { data, loading, refetch } = useApi<ItemDetailResponse>(itemId ? `/warehouse/item/${itemId}` : null)
  const { data: taxonomy } = useApi<CategoryDef[]>('/warehouse/categories')
  const { data: warehouses } = useResource<Warehouse>('warehouses')
  const { update: updateItem } = useResource<Item>('items')

  const item = data?.item
  const meta = categoryMeta(item?.category || 'OTHER')
  const Icon = meta.icon
  const totalQty = (data?.stock ?? []).reduce((s, r) => s + (r.quantity || 0), 0)
  const photos = data?.photos ?? []
  const [activePhoto, setActivePhoto] = useState(0)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editingMin, setEditingMin] = useState(false)
  const [minDraft, setMinDraft] = useState('')
  const [savingMin, setSavingMin] = useState(false)

  const handlePhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !item) return
    try {
      setUploading(true)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      await apiPost(`/warehouse/item-photo/${item.id}`, { data: dataUrl, mime: file.type })
      toast.success(t('warehouse.photos.uploaded'))
      refetch()
    } catch (e2) {
      toast.error(e2 instanceof Error ? e2.message : t('common.error'))
    } finally {
      setUploading(false)
    }
  }

  const startEditMin = () => {
    setMinDraft(item?.min_stock ? String(item.min_stock) : '0')
    setEditingMin(true)
  }

  const saveMin = async () => {
    if (!item) return
    const n = Number(minDraft)
    if (!Number.isFinite(n) || n < 0) return
    try {
      setSavingMin(true)
      await updateItem(item.id, { min_stock: n })
      toast.success(t('warehouse.radar.updated'))
      setEditingMin(false)
      refetch()
    } catch (e2) {
      toast.error(e2 instanceof Error ? e2.message : t('common.error'))
    } finally {
      setSavingMin(false)
    }
  }

  return (
    <Dialog
      open={itemId !== null}
      onClose={onClose}
      title={item ? pickName(item, lang) : t('warehouse.explorer.item_detail')}
      description={item ? <span className="font-mono">{item.code}</span> : undefined}
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      {loading || !data || !item ? (
        <LoadingState label={t('common.loading')} />
      ) : (
        <>
          {/* Item photo(s) */}
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoPick}
            />
            {photos.length > 0 ? (
              <>
                <div className="relative">
                  <img
                    src={photos[Math.min(activePhoto, photos.length - 1)]}
                    alt={pickName(item, lang)}
                    className="h-56 max-h-56 w-full cursor-default rounded-xl object-cover"
                  />
                  <Button
                    variant="outline"
                    className="absolute bottom-2 end-2 bg-white/90 backdrop-blur"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Camera className="h-4 w-4" />
                    {uploading ? t('warehouse.photos.uploading') : t('warehouse.photos.add')}
                  </Button>
                </div>
                {photos.length > 1 && (
                  <div className="mt-2 flex gap-2">
                    {photos.map((src, i) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setActivePhoto(i)}
                        className={cn(
                          'h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-1 ring-inset transition',
                          i === Math.min(activePhoto, photos.length - 1)
                            ? 'ring-2 ring-primary'
                            : 'ring-slate-200 dark:ring-slate-700 hover:ring-slate-300',
                        )}
                      >
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Camera className="h-4 w-4" />
                  {uploading ? t('warehouse.photos.uploading') : t('warehouse.photos.add')}
                </Button>
              </div>
            )}
          </div>

          {/* Category › sub chip */}
          <div className="mb-4">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                meta.chip,
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {categoryLabel(taxonomy, item.category, lang)}
              {item.sub_category && (
                <>
                  <ChevronRight className="h-3 w-3 opacity-50 rtl:rotate-180" />
                  {subCategoryLabel(taxonomy, item.sub_category, lang)}
                </>
              )}
            </span>
          </div>

          {/* Meta grid — skip empty fields */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {item.size_label && (
              <Meta label={t('warehouse.explorer.size')}>
                <span dir="ltr">{item.size_label}</span>
              </Meta>
            )}
            <Meta label={t('warehouse.col.uom')}>{item.uom || '—'}</Meta>
            {item.spec && <Meta label={t('warehouse.col.spec')}>{item.spec}</Meta>}
            {item.condition && (
              <Meta label={t('warehouse.condition.label')}>
                <Badge color={CONDITION_COLOR[item.condition as ItemCondition]}>
                  {t(`warehouse.condition.${item.condition}`)}
                </Badge>
              </Meta>
            )}
            {item.shelf_location && (
              <Meta label={t('warehouse.field.location')}>{item.shelf_location}</Meta>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-400 dark:text-slate-400">{t('warehouse.radar.set_min')}</p>
              {editingMin ? (
                <div className="mt-1">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      value={minDraft}
                      onChange={(e) => setMinDraft(e.target.value)}
                      className="input-base h-7 w-20 px-2 py-0 text-sm"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={saveMin}
                      disabled={savingMin}
                      className="text-primary hover:text-primary-dark disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingMin(false)}
                      disabled={savingMin}
                      className="text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">{t('warehouse.radar.min_hint')}</p>
                </div>
              ) : (
                <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
                  <span className="tabular-nums">{item.min_stock ? formatNumber(item.min_stock, lang) : '—'}</span>
                  <button
                    type="button"
                    onClick={startEditMin}
                    className="text-slate-400 dark:text-slate-400 transition hover:text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            {item.description && (
              <div className="col-span-2 sm:col-span-3">
                <Meta label={t('common.description')}>{item.description}</Meta>
              </div>
            )}
          </div>

          {/* Distribution across warehouses */}
          <Section title={t('warehouse.explorer.distribution')} icon={<Boxes className="h-5 w-5 text-primary" />}>
            {data.stock.length === 0 ? (
              <EmptyState title={t('warehouse.explorer.no_stock')} />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {data.stock.map((s) => (
                  <li key={s.warehouse_id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                        {pickName({ name_ar: s.name_ar, name_en: s.name_en ?? undefined }, lang)}
                      </span>
                      <Badge color={WAREHOUSE_TYPE_COLOR[s.type]}>{t(`warehouse.wh_type.${s.type}`)}</Badge>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                      {formatNumber(s.quantity, lang)}
                      <span className="ms-1 text-xs font-normal text-slate-400 dark:text-slate-400">{item.uom}</span>
                    </span>
                  </li>
                ))}
                <li className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5">
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t('common.total')}</span>
                  <span className="font-bold tabular-nums text-primary">
                    {formatNumber(totalQty, lang)}
                    <span className="ms-1 text-xs font-normal text-slate-400 dark:text-slate-400">{item.uom}</span>
                  </span>
                </li>
              </ul>
            )}
          </Section>

          {/* Recent movements */}
          <div className="mt-6">
            <Section title={t('warehouse.explorer.recent_moves')} icon={<ArrowLeftRight className="h-5 w-5 text-primary" />}>
              <div className="p-4">
                <MovementTimeline moves={data.moves} warehouses={warehouses} compact />
              </div>
            </Section>
          </div>
        </>
      )}
    </Dialog>
  )
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-400 dark:text-slate-400">{label}</p>
      <div className="mt-1 truncate text-sm text-slate-700 dark:text-slate-200">{children}</div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-800/60 px-4 py-2.5">
        {icon}
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h4>
      </div>
      {children}
    </div>
  )
}
