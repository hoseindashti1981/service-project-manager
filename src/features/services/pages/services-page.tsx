import { useEffect, useState, type FormEvent } from 'react'
import { Edit3, Plus, Save, X } from 'lucide-react'
import { serviceRepository } from '@/db/repositories/service-repository'
import { formatMoney } from '@/lib/money'
import type { Service } from '@/domain/service/types'
import type { Unit } from '@/types'

import { serviceUnits as units, normalizeDigits, validateServicePrice } from '@/domain/service/helpers'

export function ServicesPage() {
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [services, setServices] = useState<Service[]>([])
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<Unit>('piece')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = async () => setServices(await serviceRepository.getAll())
  useEffect(() => { let active = true; void serviceRepository.getAll().then((rows) => { if (active) setServices(rows) }).catch(() => { if (active) setError('بارگذاری خدمات ناموفق بود.') }); return () => { active = false } }, [])
  const reset = () => { setName(''); setUnit('piece'); setPrice(''); setDescription(''); setEditing(null); setError(null) }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) { setError('نام خدمت را وارد کنید.'); return }
    if (busy) return
    setBusy(true); setError(null)
    try {
      const input = { name, defaultUnit: unit, defaultUnitPrice: validateServicePrice(Number(normalizeDigits(price))), description, isActive: services.find((service) => service.id === editing)?.isActive ?? true }
      if (editing) await serviceRepository.update(editing, input)
      else await serviceRepository.create(input)
      reset(); await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'ذخیره خدمت ناموفق بود.') }
    finally { setBusy(false) }
  }
  async function toggle(service: Service) {
    setBusy(true); setError(null)
    try { await serviceRepository.update(service.id, { isActive: !service.isActive }); await load() }
    catch { setError('تغییر وضعیت ناموفق بود.') }
    finally { setBusy(false) }
  }  function startEdit(service: Service) { setError(null); setEditing(service.id); setName(service.name); setUnit(service.defaultUnit); setPrice(String(service.defaultUnitPrice ?? 0)); setDescription(service.description ?? '') }

  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">خدمات و قیمت پایه</h1><p className="mt-1 text-sm text-slate-500">قیمت پایه برای سرعت ثبت است؛ در هر پروژه می‌توانید آن را تغییر دهید.</p></div><form onSubmit={(event) => void submit(event)} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2"><label className="md:col-span-2"><span className="mb-1 block text-sm font-medium">نام خدمت</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="مثلاً نصب چراغ" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500" /></label><label><span className="mb-1 block text-sm font-medium">واحد</span><select value={unit} onChange={(event) => setUnit(event.target.value as Unit)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5">{units.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label><span className="mb-1 block text-sm font-medium">قیمت پایه (تومان)</span><input value={price} onChange={(event) => setPrice(normalizeDigits(event.target.value))} inputMode="numeric" placeholder="۰" className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label><label className="md:col-span-2"><span className="mb-1 block text-sm font-medium">توضیح (اختیاری)</span><input value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>{error && <p role="alert" className="md:col-span-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<div className="flex gap-2"><button disabled={busy} className="disabled:opacity-50 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">{editing ? <Save size={17} /> : <Plus size={17} />}{editing ? 'ذخیرهٔ تغییرات' : 'افزودن خدمت'}</button>{editing && <button type="button" onClick={reset} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><X size={16} />انصراف</button>}</div></form><section className="space-y-3"><h2 className="font-bold">کاتالوگ خدمات</h2><input aria-label="جستجوی خدمات" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جستجوی خدمات" className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />{services.length === 0 ? <p className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">هنوز خدمتی ثبت نشده است.</p> : services.filter((service) => service.name.includes(query.trim())).map((service) => <article key={service.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><div className="min-w-0 flex-1"><h3 className="font-semibold">{service.name}{!service.isActive && <span className="mr-2 text-xs text-slate-400">غیرفعال</span>}</h3><p className="mt-1 text-xs text-slate-500">{units.find((item) => item.value === service.defaultUnit)?.label ?? service.defaultUnit} · قیمت پایه: {formatMoney(service.defaultUnitPrice ?? 0)}</p>{service.description && <p className="mt-1 text-xs text-slate-400">{service.description}</p>}</div><button disabled={busy || editing === service.id} onClick={() => void toggle(service)} className="text-xs text-slate-600 disabled:opacity-50">{service.isActive ? 'غیرفعال‌کردن' : 'فعال‌کردن'}</button><button disabled={busy} onClick={() => startEdit(service)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"><Edit3 size={16} />ویرایش</button></article>)}</section></div>
}
