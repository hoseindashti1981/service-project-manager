import { useEffect, useState } from 'react'
import { customerRepository } from '@/db/repositories/customer-repository'
import { projectRepository } from '@/db/repositories/project-repository'
import { financeRepository } from '@/db/repositories/finance-repository'
import type { Customer } from '@/domain/customer/types'
import type { Project } from '@/domain/project/types'
import type { Invoice, Payment, Quotation } from '@/domain/finance/types'
import { formatMoney } from '@/lib/money'
import { downloadDocumentPdf } from '@/lib/document-pdf'

type Kind = 'quotation' | 'invoice' | 'payment' | null
const today = () => new Date().toISOString().slice(0, 10)

export function FinancePage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [kind, setKind] = useState<Kind>(null)
  const [error, setError] = useState('')

  const load = async () => {
    const [c, p, q, i, pay] = await Promise.all([customerRepository.getAll(), projectRepository.getAll(), financeRepository.getQuotations(), financeRepository.getInvoices(), financeRepository.getPayments()])
    setCustomers(c); setProjects(p); setQuotations(q); setInvoices(i); setPayments(pay)
  }
  useEffect(() => { void load() }, [])

  const received = payments.reduce((sum, item) => sum + item.amount, 0)
  const billed = invoices.filter((item) => item.status !== 'void').reduce((sum, item) => sum + item.total, 0)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget)
    const customerId = String(data.get('customerId')); const projectId = String(data.get('projectId') || '') || undefined
    if (!customerId || !kind) { setError('مشتری را انتخاب کنید'); return }
    try {
      if (kind === 'payment') await financeRepository.createPayment({ customerId, projectId, invoiceId: String(data.get('invoiceId') || '') || undefined, amount: Number(data.get('amount')), date: String(data.get('date')), method: String(data.get('method')) as Payment['method'], note: String(data.get('note') || '') })
      else {
        const quantity = Number(data.get('quantity')); const unitPrice = Number(data.get('unitPrice'))
        const input = { customerId, projectId, date: String(data.get('date')), status: (kind === 'quotation' ? 'draft' : 'issued') as 'draft' | 'issued', lines: [{ id: '', description: String(data.get('description')), quantity, unitPrice, total: Math.round(quantity * unitPrice) }], note: String(data.get('note') || '') }
        if (kind === 'quotation') await financeRepository.createQuotation(input)
        else await financeRepository.createInvoice(input)
      }
      setKind(null); setError(''); await load()
    } catch { setError('ذخیره‌سازی ناموفق بود') }
  }

  return <div className="max-w-4xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">مالی</h2><p className="text-sm text-slate-500">مانده کل: {formatMoney(billed - received)}</p></div><div className="flex gap-2"><button onClick={() => setKind('quotation')} className="rounded-lg border px-3 py-2 text-sm">پیش‌فاکتور</button><button onClick={() => setKind('invoice')} className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white">فاکتور</button><button onClick={() => setKind('payment')} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white">پرداخت</button></div></div>
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">فاکتور معتبر</p><b>{formatMoney(billed)}</b></div><div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">دریافتی</p><b>{formatMoney(received)}</b></div></div>
    {kind && <form onSubmit={submit} className="grid gap-3 rounded-xl border bg-white p-4"><b>{kind === 'quotation' ? 'پیش‌فاکتور جدید' : kind === 'invoice' ? 'فاکتور جدید' : 'ثبت پرداخت'}</b><select name="customerId" required className="rounded-lg border p-2"><option value="">انتخاب مشتری</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><select name="projectId" className="rounded-lg border p-2"><option value="">بدون پروژه</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select>{kind === 'payment' ? <><select name="invoiceId" className="rounded-lg border p-2"><option value="">بدون اتصال به فاکتور</option>{invoices.filter((i) => i.status !== 'void').map((i) => <option key={i.id} value={i.id}>{i.number}</option>)}</select><input name="amount" required type="number" min="1" placeholder="مبلغ تومان" className="rounded-lg border p-2"/><select name="method" className="rounded-lg border p-2"><option value="transfer">واریز</option><option value="cash">نقدی</option><option value="card">کارت</option><option value="cheque">چک</option></select></> : <><input name="description" required placeholder="شرح ردیف" className="rounded-lg border p-2"/><div className="grid grid-cols-2 gap-2"><input name="quantity" required type="number" min="1" defaultValue="1" className="rounded-lg border p-2"/><input name="unitPrice" required type="number" min="0" placeholder="قیمت واحد" className="rounded-lg border p-2"/></div></>}<input name="date" type="date" defaultValue={today()} className="rounded-lg border p-2"/><input name="note" placeholder="یادداشت" className="rounded-lg border p-2"/><button className="rounded-lg bg-slate-800 p-2 text-white">ذخیره</button></form>}
    {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <Balances customers={customers} projects={projects} />
    <Records invoices={invoices} payments={payments} quotations={quotations} refresh={load} />
  </div>
}

function Balances({ customers, projects }: { customers: Customer[]; projects: Project[] }) {
  const [balances, setBalances] = useState<Record<string, number>>({})
  useEffect(() => { void (async () => { const entries = await Promise.all([...customers.map(async (item) => [item.id, await financeRepository.balanceForCustomer(item.id)] as const), ...projects.map(async (item) => [item.id, await financeRepository.balanceForProject(item.id)] as const)]); setBalances(Object.fromEntries(entries)) })() }, [customers, projects])
  return <section className="space-y-2"><h3 className="font-bold">ماندهٔ حساب</h3>{customers.map((item) => <p key={item.id} className="rounded-lg border bg-white p-3 text-sm">مشتری: {item.name} — {formatMoney(balances[item.id] || 0)}</p>)}{projects.map((item) => <p key={item.id} className="rounded-lg border bg-white p-3 text-sm">پروژه: {item.title} — {formatMoney(balances[item.id] || 0)}</p>)}</section>
}

function Records({ invoices, payments, quotations, refresh }: { invoices: Invoice[]; payments: Payment[]; quotations: Quotation[]; refresh: () => Promise<void> }) {
  return <section className="space-y-2"><h3 className="font-bold">اسناد</h3>{invoices.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white p-3 text-sm"><span>{item.number} — {formatMoney(item.total)} — {item.status}</span><span className="flex gap-3"><button onClick={() => void downloadDocumentPdf('فاکتور', item.number, item.date, item.total, item.lines)} className="text-indigo-600">PDF</button>{item.status !== 'void' && <button onClick={async () => { await financeRepository.voidInvoice(item.id, 'ابطال توسط کاربر'); await refresh() }} className="text-red-600">ابطال</button>}</span></div>)}{payments.map((item) => <p key={item.id} className="rounded-lg border bg-white p-3 text-sm">پرداخت {item.date} — {formatMoney(item.amount)}</p>)}{quotations.map((item) => <div key={item.id} className="flex justify-between rounded-lg border bg-white p-3 text-sm"><span>{item.number} — {formatMoney(item.total)}</span><button onClick={() => void downloadDocumentPdf('پیش‌فاکتور', item.number, item.date, item.total, item.lines)} className="text-indigo-600">PDF</button></div>)}</section>
}
