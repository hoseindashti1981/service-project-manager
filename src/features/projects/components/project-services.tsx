import { useEffect, useState, type FormEvent } from 'react'
import { serviceRepository } from '@/db/repositories/service-repository'
import { projectItemRepository } from '@/db/repositories/project-item-repository'
import type { Service } from '@/domain/service/types'
import type { ProjectItem } from '@/domain/project-item/types'
import type { Unit } from '@/types'
import { normalizeDigits, serviceUnits, validateServicePrice } from '@/domain/service/helpers'
import { formatMoney } from '@/lib/money'

export function ProjectServices({ projectId }: { projectId: string }) {
  const [services, setServices] = useState<Service[]>([])
  const [items, setItems] = useState<ProjectItem[]>([])
  const [serviceId, setServiceId] = useState('')
  const [title, setTitle] = useState('')
  const [unit, setUnit] = useState<Unit>('piece')
  const [quantity, setQuantity] = useState('1')
  const [price, setPrice] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = async () => {
    const [catalog, rows] = await Promise.all([serviceRepository.getActive(), projectItemRepository.getByProjectId(projectId)])
    setServices(catalog); setItems(rows)
  }
  useEffect(() => { let active = true; void Promise.all([serviceRepository.getActive(), projectItemRepository.getByProjectId(projectId)]).then(([catalog, rows]) => { if (active) { setServices(catalog); setItems(rows) } }).catch(() => { if (active) setError('بارگذاری خدمات پروژه ناموفق بود.') }); return () => { active = false } }, [projectId])
  const reset = () => { setServiceId(''); setTitle(''); setUnit('piece'); setQuantity('1'); setPrice(''); setEditing(null) }
  function selectService(id: string) {
    setServiceId(id)
    const service = services.find((item) => item.id === id)
    if (service) { setTitle(service.name); setUnit(service.defaultUnit); setPrice(String(service.defaultUnitPrice ?? 0)) }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      const amount = Number(normalizeDigits(quantity))
      const unitPrice = validateServicePrice(Number(normalizeDigits(price)))
      if (!title.trim() || !Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount * unitPrice))) throw new Error('عنوان، مقدار مثبت و قیمت معتبر وارد کنید.')
      const input = { projectId, serviceId: serviceId || undefined, title, unit, quantity: amount, unitPrice, pricingType: 'PER_UNIT' as const }
      if (editing) await projectItemRepository.update(editing, input)
      else await projectItemRepository.create(input)
      reset(); await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'ذخیره ناموفق بود.') }
    finally { setBusy(false) }
  }
  async function remove(item: ProjectItem) {
    if (!confirm(`خدمت «${item.title}» از پروژه حذف شود؟`)) return
    setBusy(true); setError('')
    try { await projectItemRepository.delete(item.id); if (editing === item.id) reset(); await load() }
    catch { setError('حذف خدمت ناموفق بود.') }
    finally { setBusy(false) }
  }
  const field = 'w-full rounded-lg border border-slate-300 p-2'
  return <section className="space-y-4 rounded-2xl border bg-white p-4">
    <h3 className="font-bold">خدمات پروژه و قیمت‌ها</h3>
    <p className="text-xs text-slate-500">قیمت هر ردیف مستقل از کاتالوگ ذخیره می‌شود. جمع خدمات، مبلغ توافق اولیه را تغییر نمی‌دهد.</p>
    <form onSubmit={(event) => void submit(event)} className="grid gap-3">
      <label>انتخاب از کاتالوگ<select value={serviceId} onChange={(event) => selectService(event.target.value)} className={field}><option value="">خدمت سفارشی</option>{serviceId && !services.some((service) => service.id === serviceId) && <option value={serviceId}>خدمت غیرفعال</option>}{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
      <label>عنوان خدمت<input required value={title} onChange={(event) => setTitle(event.target.value)} className={field} /></label>
      <div className="grid grid-cols-2 gap-3"><label>مقدار<input required inputMode="decimal" value={quantity} onChange={(event) => setQuantity(normalizeDigits(event.target.value))} className={field} /></label><label>واحد<select value={unit} onChange={(event) => setUnit(event.target.value as Unit)} className={field}>{serviceUnits.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>
      <label>قیمت واحد (تومان)<input required inputMode="numeric" value={price} onChange={(event) => setPrice(normalizeDigits(event.target.value))} className={field} /></label>
      <div className="flex gap-3"><button disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">{editing ? 'ذخیره تغییرات خدمت' : 'افزودن به پروژه'}</button>{editing && <button type="button" disabled={busy} onClick={reset}>انصراف</button>}</div>
    </form>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {items.length === 0 && <p className="text-sm text-slate-500">هنوز خدمتی برای پروژه ثبت نشده است.</p>}
    {items.map((item) => <article key={item.id} className="space-y-2 border-t pt-3"><b>{item.title}</b><p className="text-sm">{item.quantity.toLocaleString('fa-IR')} {serviceUnits.find((entry) => entry.value === item.unit)?.label} × {formatMoney(item.unitPrice)} = {formatMoney(item.totalPrice)}</p><div className="flex gap-4 text-sm"><button disabled={busy} onClick={() => { setEditing(item.id); setServiceId(item.serviceId ?? ''); setTitle(item.title); setUnit(item.unit); setQuantity(String(item.quantity)); setPrice(String(item.unitPrice)); setError('') }}>ویرایش خدمت</button><button disabled={busy} onClick={() => void remove(item)} className="text-rose-600">حذف خدمت</button></div></article>)}
    <p className="border-t pt-3 font-bold">جمع خدمات: {formatMoney(items.reduce((sum, item) => sum + item.totalPrice, 0))}</p>
  </section>
}
