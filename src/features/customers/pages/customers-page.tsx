import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { Link } from '@tanstack/react-router'
import { customerRepository } from '@/db/repositories/customer-repository'
import type { Customer } from '@/domain/customer/types'
import { customerSearchText, phoneNumber } from '@/domain/customer/contact'

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    const subscription=liveQuery(() => customerRepository.getAll()).subscribe({
      next: rows => { setCustomers(rows); setLoading(false) },
      error: () => { setError('خطا در بارگذاری مشتریان'); setLoading(false) },
    })
    return () => subscription.unsubscribe()
  },[])
  const query=customerSearchText(search)
  const visible=customers.filter(customer => customerSearchText(customer.name).includes(query) || customerSearchText(customer.mobile).includes(query))
    .sort((a,b)=>a.name.localeCompare(b.name,'fa'))
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">دفترچه تلفن مشتریان</h2><Link to="/customers/new" className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white">+ مشتری جدید</Link></div>
    <p className="text-sm text-slate-500">شماره‌ها در برنامه نگهداری می‌شوند. برای شماره‌گیری، روی شماره مشتری بزنید.</p>
    <input type="search" aria-label="جستجوی مشتری" value={search} onChange={event=>setSearch(event.target.value)} placeholder="جستجو بر اساس نام یا شماره..." className="w-full rounded-lg border p-3" />
    {loading && <p>در حال بارگذاری…</p>}
    {error && <p role="alert">{error}</p>}
    {!loading && !error && <p className="text-sm text-slate-500">{visible.length.toLocaleString('fa-IR')} مشتری</p>}
    {!loading && !error && visible.length===0 && <p>{search ? 'مشتری مطابق جستجو پیدا نشد.' : 'هنوز مشتری ثبت نشده است.'}</p>}
    {visible.map(customer=><article key={customer.id} className="space-y-3 rounded-xl border bg-white p-4">
      <Link to="/customers/$customerId" params={{customerId:customer.id}} className="block font-bold text-indigo-700">{customer.name}</Link>
      {phoneNumber(customer.mobile) && <a href={`tel:${phoneNumber(customer.mobile)}`} aria-label={`تماس با ${customer.name}`} className="inline-flex min-h-11 items-center gap-3 rounded-lg bg-emerald-50 px-3 text-emerald-800"><span>تماس</span><span dir="ltr">{customer.mobile}</span></a>}
      {customer.description && <p className="break-words text-sm text-slate-500">{customer.description}</p>}
      <Link to="/customers/$customerId" params={{customerId:customer.id}} className="block text-sm text-slate-500">مشاهده و ویرایش مشتری</Link>
    </article>)}
  </div>
}
