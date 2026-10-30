import { useEffect, useState, type FormEvent } from 'react'
import { liveQuery } from 'dexie'
import { db } from '@/db/db'
import { financeRepository } from '@/db/repositories/finance-repository'
import { MoneyInput } from '@/components/money-input'
import { PaymentActions } from '@/components/payment-actions'
import { JalaliDatePicker } from '@/components/jalali-date-picker'
import { useBusiness } from '@/domain/use-business'
import { paymentMethods } from '@/domain/finance/account'
import type { Project } from '@/domain/project/types'
import type { Customer } from '@/domain/customer/types'
import type { Invoice, Payment, Quotation } from '@/domain/finance/types'
import { formatDateFa, toISODate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { AccountingOverview } from '../accounting-overview'
import { DocumentEditor } from '../document-editor'
import { DocumentPreview } from '../document-preview'

const documentStatus: Record<string, string> = { draft: 'پیش‌نویس', issued: 'صادرشده', paid: 'تسویه‌شده', void: 'باطل‌شده', sent: 'ارسال‌شده', accepted: 'تأییدشده', rejected: 'ردشده' }

export function FinancePage() {
  const business = useBusiness()
  const [data, setData] = useState({ projects: [] as Project[], customers: [] as Customer[], invoices: [] as Invoice[], quotations: [] as Quotation[], payments: [] as Payment[] })
  const [kind, setKind] = useState<'invoice' | 'quotation' | 'payment' | null>(null)
  const [preview, setPreview] = useState<{ doc: Invoice | Quotation; kind: 'invoice' | 'quotation' } | null>(null)
  const [editing, setEditing] = useState<Invoice | Quotation>()
  const [date, setDate] = useState(toISODate)
  const [customerId, setCustomer] = useState('')
  const [projectId, setProject] = useState('')
  const [paymentInvoiceId, setPaymentInvoiceId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const subscription = liveQuery(async () => {
      const [projects, customers, invoices, quotations, payments] = await Promise.all([
        db.projects.toArray(), db.customers.toArray(), financeRepository.getInvoices(), financeRepository.getQuotations(), financeRepository.getPayments(),
      ])
      return { projects, customers, invoices, quotations, payments }
    }).subscribe({ next: setData, error: () => setError('خواندن اطلاعات حسابداری ناموفق بود.') })
    return () => subscription.unsubscribe()
  }, [])

  const customerName = (id: string) => data.customers.find((customer) => customer.id === id)?.name || 'مشتری حذف‌شده'
  const openForm = (next: 'invoice' | 'quotation' | 'payment', nextCustomerId = '', nextProjectId = '', nextInvoiceId = '') => {
    setKind(next); setEditing(undefined); setDate(toISODate()); setError(''); setCustomer(nextCustomerId); setProject(nextProjectId); setPaymentInvoiceId(nextInvoiceId)
    setTimeout(() => document.getElementById(next === 'payment' ? 'accounting-payment-editor' : 'accounting-document-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      await financeRepository.createPayment({
        customerId,
        projectId: projectId || undefined,
        invoiceId: String(form.get('invoiceId') || '') || undefined,
        amount: Number(form.get('amount')),
        date,
        method: String(form.get('method')) as Payment['method'],
        note: String(form.get('note') || ''),
      })
      setKind(null); setPaymentInvoiceId('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ثبت دریافت ناموفق بود.')
    } finally {
      setBusy(false)
    }
  }

  if (preview) return <DocumentPreview {...preview} onBack={() => setPreview(null)} onEdit={() => { setEditing(preview.doc); setKind(preview.kind); setPreview(null) }} />

  return <div className="mx-auto max-w-6xl space-y-7">
    <header><h1 className="text-2xl font-black text-slate-900">حسابداری</h1><p className="mt-2 text-sm leading-7 text-slate-500">نمای روشن و جداشدهٔ برآورد، کارکرد، مطالبات، دریافت‌ها و هزینه‌های لاین‌یار</p></header>
    <AccountingOverview onCreateInvoice={(selectedProjectId, selectedCustomerId) => openForm('invoice', selectedCustomerId, selectedProjectId)} onCreatePayment={(selectedCustomerId, selectedProjectId, selectedInvoiceId) => openForm('payment', selectedCustomerId, selectedProjectId, selectedInvoiceId)} />

    <section id="accounting-actions" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div><h2 className="font-bold">عملیات حسابداری</h2><p className="mt-1 text-xs leading-6 text-slate-500">برای ایجاد طلب قطعی، فاکتور را صادر کنید. ثبت دریافت به‌تنهایی مبلغ کارکرد یا فاکتور را تغییر نمی‌دهد.</p></div>
      <div className="grid gap-2 sm:grid-cols-3">
        <button className="min-h-11 rounded-xl border border-slate-300 bg-slate-50 px-3 font-medium" onClick={() => openForm('quotation')}>پیش‌فاکتور جدید</button>
        <button className="min-h-11 rounded-xl bg-indigo-700 px-3 font-medium text-white" onClick={() => openForm('invoice')}>فاکتور جدید</button>
        <button className="min-h-11 rounded-xl bg-emerald-700 px-3 font-medium text-white" onClick={() => openForm('payment')}>ثبت دریافت</button>
      </div>
    </section>

    {(kind === 'invoice' || kind === 'quotation') && <DocumentEditor kind={kind} customers={data.customers} projects={data.projects} existing={editing} initialCustomerId={customerId} initialProjectId={projectId} onCancel={() => setKind(null)} onSave={(doc) => {
      setPreview({ doc: { ...doc, business: doc.business || business, customerSnapshot: doc.customerSnapshot || { name: customerName(doc.customerId), mobile: data.customers.find((customer) => customer.id === doc.customerId)?.mobile || '' }, projectSnapshot: doc.projectSnapshot || data.projects.find((project) => project.id === doc.projectId)?.title, projectAddress: doc.projectAddress || data.projects.find((project) => project.id === doc.projectId)?.address }, kind })
      setKind(null)
      setEditing(undefined)
    }} />}

    {kind === 'payment' && <form id="accounting-payment-editor" onSubmit={submitPayment} className="space-y-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
      <h2 className="font-bold">ثبت دریافت از مشتری</h2>
      <select aria-label="مشتری پرداخت" name="customerId" required className="min-h-11 w-full rounded-xl border border-slate-300 p-2 text-base" value={customerId} onChange={(event) => { setCustomer(event.target.value); setProject(''); setPaymentInvoiceId('') }}><option value="">انتخاب مشتری</option>{data.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select>
      <select aria-label="پروژه پرداخت" name="projectId" className="min-h-11 w-full rounded-xl border border-slate-300 p-2 text-base" value={projectId} onChange={(event) => { setProject(event.target.value); setPaymentInvoiceId('') }}><option value="">بدون پروژه</option>{data.projects.filter((project) => project.customerId === customerId).map((project) => <option key={project.id} value={project.id}>{project.title} — {customerName(project.customerId)}</option>)}</select>
      <select name="invoiceId" aria-label="فاکتور پرداخت" value={paymentInvoiceId} onChange={(event) => setPaymentInvoiceId(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 p-2 text-base"><option value="">علی‌الحساب / بدون اتصال به فاکتور</option>{data.invoices.filter((invoice) => invoice.customerId === customerId && !['void', 'draft'].includes(invoice.status) && invoice.projectId === (projectId || undefined)).map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.number} — {formatMoney(invoice.total)}</option>)}</select>
      <MoneyInput name="amount" aria-label="مبلغ پرداخت" type="number" min="1" required placeholder="مبلغ دریافت‌شده (تومان)" className="min-h-11 w-full rounded-xl border border-slate-300 p-2" />
      <select name="method" aria-label="روش دریافت" className="min-h-11 w-full rounded-xl border border-slate-300 p-2 text-base">{Object.entries(paymentMethods).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <JalaliDatePicker name="date" label="تاریخ دریافت" value={date} onChange={setDate} />
      <textarea rows={4} name="note" placeholder="توضیحات دریافت" className="w-full rounded-xl border border-slate-300 p-2" />
      <div className="flex gap-3"><button disabled={busy} className="min-h-11 rounded-xl bg-emerald-700 px-4 text-white">ذخیره دریافت</button><button type="button" disabled={busy} onClick={() => setKind(null)} className="min-h-11 rounded-xl border px-4">انصراف</button></div>
    </form>}

    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

    <div className="grid gap-6 xl:grid-cols-2">
      <section className="space-y-3"><div><h2 className="font-bold">اسناد مالی</h2><p className="mt-1 text-xs text-slate-500">پیش‌فاکتور، فاکتور و وضعیت فعلی هر سند</p></div>{data.invoices.length + data.quotations.length === 0 && <EmptyState text="هنوز سندی ثبت نشده است." />}{[...data.invoices.map((doc) => ({ doc, kind: 'invoice' as const })), ...data.quotations.map((doc) => ({ doc, kind: 'quotation' as const }))].map(({ doc, kind: documentKind }) => <article key={doc.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="font-bold">{doc.number} · {customerName(doc.customerId)}</p><p className="mt-1 text-sm text-slate-500">{formatDateFa(doc.date)} · {documentStatus[doc.status]}</p><p className="mt-2 text-lg font-black">{formatMoney(doc.total)}</p><div className="mt-2 flex gap-3"><button className="min-h-11 text-indigo-700" onClick={() => setPreview({ doc: { ...doc, business: doc.business || business, customerSnapshot: doc.customerSnapshot || { name: customerName(doc.customerId), mobile: data.customers.find((customer) => customer.id === doc.customerId)?.mobile || '' }, projectSnapshot: doc.projectSnapshot || data.projects.find((project) => project.id === doc.projectId)?.title, projectAddress: doc.projectAddress || data.projects.find((project) => project.id === doc.projectId)?.address }, kind: documentKind })}>پیش‌نمایش</button>{documentKind === 'invoice' && doc.status !== 'void' && <button className="min-h-11 px-3 text-rose-700" onClick={async () => { const reason = prompt('دلیل ابطال فاکتور:'); if (!reason) return; try { await financeRepository.voidInvoice(doc.id, reason) } catch (cause) { setError(String(cause)) } }}>ابطال</button>}</div></article>)}</section>

      <section className="space-y-3"><div><h2 id="payments" style={{ scrollMarginTop: 90 }} className="font-bold">دریافتی‌ها</h2><p className="mt-1 text-xs text-slate-500">تمام پرداخت‌های ثبت‌شده با امکان اصلاح یا حذف</p></div>{data.payments.length === 0 && <EmptyState text="هنوز دریافتی ثبت نشده است." />}{data.payments.map((payment) => <article key={payment.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><b>دریافت {formatMoney(payment.amount)}</b><p className="mt-1 text-sm">{customerName(payment.customerId)} · {data.projects.find((project) => project.id === (payment.projectId || data.invoices.find((invoice) => invoice.id === payment.invoiceId && invoice.customerId === payment.customerId)?.projectId))?.title || 'بدون پروژه'}</p><p className="text-sm text-slate-500">{formatDateFa(payment.date)} · {paymentMethods[payment.method]}</p>{payment.note && <p className="mt-2 text-sm">{payment.note}</p>}<PaymentActions payment={payment} /></article>)}</section>
    </div>
  </div>
}

function EmptyState({ text }: { text: string }) { return <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">{text}</p> }
