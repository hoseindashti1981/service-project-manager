import { useEffect, useState } from 'react'
import { BackupPanel } from '../components/backup-panel'
import { liveQuery } from 'dexie'
import { financeRepository } from '@/db/repositories/finance-repository'
import { projectRepository } from '@/db/repositories/project-repository'
import { formatMoney } from '@/lib/money'

export function ReportsPage() {
  const [report, setReport] = useState({ income: 0, payments: 0, outstanding: 0, active: 0 })
  const [error, setError] = useState('')
  useEffect(() => {
    const subscription = liveQuery(async () => {
      const [invoices, payments, projects] = await Promise.all([financeRepository.getInvoices(),financeRepository.getPayments(),projectRepository.getAll()])
      const income=invoices.filter(item => item.status !== 'void').reduce((sum,item) => sum+item.total,0)
      const received=payments.reduce((sum,item) => sum+item.amount,0)
      return { income,payments:received,outstanding:income-received,active:projects.filter(item => item.status === 'in_progress').length }
    }).subscribe({ next:setReport,error:() => setError('بارگذاری گزارش ناموفق بود.') })
    return () => subscription.unsubscribe()
  },[])
  const cards = [['درآمد فاکتورهای معتبر', report.income, 'bg-indigo-600'], ['دریافتی‌ها', report.payments, 'bg-emerald-600'], ['ماندهٔ قابل دریافت', report.outstanding, 'bg-amber-500'], ['پروژه‌های در جریان', report.active, 'bg-slate-700']]
  return <div className="max-w-5xl space-y-6"><div><h2 className="text-xl font-bold">گزارش‌ها و بکاپ</h2><p className="text-sm text-slate-500">گزارش‌های واقعی بر پایهٔ داده‌های ذخیره‌شده در دستگاه شما</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([title, value, color]) => <div key={title} className={`${color} rounded-2xl p-5 text-white shadow-sm`}><p className="text-xs text-white/75">{title}</p><p className="mt-3 text-xl font-bold">{typeof value === 'number' && title !== 'پروژه‌های در جریان' ? formatMoney(value) : value}</p></div>)}</div>{error && <p role="alert">{error}</p>}<BackupPanel /></div>
}
