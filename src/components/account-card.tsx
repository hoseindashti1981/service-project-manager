import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { readAccountingTotals, readProjectFinancialPosition } from '@/db/repositories/accounting-repository'
import type { AccountingTotals, ProjectFinancialPosition } from '@/domain/finance/financial-position'
import { formatMoney } from '@/lib/money'

type CardData = ProjectFinancialPosition | AccountingTotals

export function AccountCard({ projectId, customerId, title = 'خلاصه حساب' }: { projectId?: string; customerId?: string; title?: string }) {
  const [account, setAccount] = useState<CardData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const subscription = liveQuery(async (): Promise<CardData> => projectId ? await readProjectFinancialPosition(projectId) : await readAccountingTotals(customerId))
      .subscribe({ next: (value) => { setAccount(value); setLoading(false) }, error: () => { setError('خواندن حساب ناموفق بود.'); setLoading(false) } })
    return () => subscription.unsubscribe()
  }, [customerId, projectId])

  const status = !account ? null : account.outstanding > 0
    ? { label: 'بدهکار', amount: account.outstanding, className: 'border-rose-200 bg-rose-50 text-rose-800' }
    : account.credit > 0
      ? { label: 'بستانکار', amount: account.credit, className: 'border-sky-200 bg-sky-50 text-sky-800' }
      : { label: 'تسویه‌شده', amount: 0, className: 'border-emerald-200 bg-emerald-50 text-emerald-800' }

  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label={title}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-slate-500">تصویر مالی هماهنگ با حسابداری</p><h3 className="mt-1 font-bold text-slate-900">{title}</h3></div>{status && <span className={`rounded-full border px-3 py-1 text-xs font-bold ${status.className}`}>{status.label}: {formatMoney(status.amount)}</span>}</div>
    {loading && <p role="status" className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">در حال محاسبه حساب…</p>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {account && <>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <AccountValue label="برآورد فعلی" value={account.forecastNet} />
        <AccountValue label="کارکرد خالص" value={account.earnedNet} />
        <AccountValue label="صورتحساب‌نشده" value={account.unbilledEarned} />
        <AccountValue label="طلب قطعی" value={account.invoiced} />
        <AccountValue label="دریافتی" value={account.received} />
        <AccountValue label="هزینه ثبت‌شده" value={account.costs} />
      </dl>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-rose-50 p-3"><p className="text-xs text-rose-700">مانده قابل وصول</p><b className="mt-1 block break-words text-rose-900">{formatMoney(account.outstanding)}</b></div>
        <div className="rounded-xl bg-sky-50 p-3"><p className="text-xs text-sky-700">اعتبار مشتری</p><b className="mt-1 block break-words text-sky-900">{formatMoney(account.credit)}</b></div>
      </div>
      <p className="text-xs leading-6 text-slate-500">برآورد و کارکرد بدهی مشتری نیستند؛ فقط فاکتور صادرشده طلب قطعی ایجاد می‌کند و دریافت، مانده آن را کاهش می‌دهد.</p>
    </>}
    {(projectId || customerId) && <div className="flex flex-wrap gap-4 text-sm font-medium"><Link to="/finance" search={{ customerId, projectId, metric: 'outstanding' }} className="inline-flex min-h-11 items-center text-indigo-700">باز کردن ریز حسابداری ←</Link><Link to="/finance" search={{ customerId, projectId, metric: 'received' }} hash="payments" className="inline-flex min-h-11 items-center text-emerald-700">ویرایش یا حذف دریافتی‌ها ←</Link></div>}
  </section>
}

function AccountValue({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words font-bold text-slate-900">{formatMoney(value)}</dd></div>
}
