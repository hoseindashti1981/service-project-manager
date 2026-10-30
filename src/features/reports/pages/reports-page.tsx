import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { readAccountingTotals } from '@/db/repositories/accounting-repository'
import { liveQuery } from 'dexie'

import { projectRepository } from '@/db/repositories/project-repository'
import { formatMoney } from '@/lib/money'

export function ReportsPage() {
  const [report, setReport] = useState({ earned: 0, invoiced: 0, payments: 0, outstanding: 0, credit: 0, active: 0 })
  const [error, setError] = useState('')
  useEffect(() => {
    const subscription = liveQuery(async () => {
      const [account,projects]=await Promise.all([readAccountingTotals(),projectRepository.getAll()])
      return { earned:account.earnedNet,invoiced:account.invoiced,payments:account.received,outstanding:account.outstanding,credit:account.credit,active:projects.filter(item => item.status === 'in_progress').length }
    }).subscribe({ next:setReport,error:() => setError('بارگذاری گزارش ناموفق بود.') })
    return () => subscription.unsubscribe()
  },[])
  const cards = [['کارکرد خالص', report.earned, 'bg-indigo-600'], ['طلب قطعی', report.invoiced, 'bg-violet-600'], ['دریافتی‌ها', report.payments, 'bg-emerald-600'], ['ماندهٔ قابل وصول', report.outstanding, 'bg-rose-600'], ['اعتبار مشتریان', report.credit, 'bg-sky-600'], ['پروژه‌های در جریان', report.active, 'bg-slate-700']]
  return <div className="max-w-5xl space-y-6"><div><h2 className="text-xl font-bold">گزارش‌ها و بکاپ</h2><p className="text-sm text-slate-500">گزارش‌های واقعی با همان منبع حقیقت صفحه حسابداری</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([title, value, color]) => <div key={title} className={`${color} rounded-2xl p-5 text-white shadow-sm`}><p className="text-xs text-white/75">{title}</p><p className="mt-3 text-xl font-bold">{typeof value === 'number' && title !== 'پروژه‌های در جریان' ? formatMoney(value) : value}</p></div>)}</div>{error && <p role="alert">{error}</p>}<div className="flex flex-wrap gap-4"><Link to="/finance" search={{}} className="inline-flex min-h-11 items-center text-indigo-700">مشاهده حسابداری و ریزحساب‌ها</Link><Link to="/settings" className="inline-flex min-h-11 items-center text-indigo-700">بکاپ و بازیابی در تنظیمات</Link></div></div>
}
