import {Link} from '@tanstack/react-router'
import { useEffect,useState } from 'react'
import { liveQuery } from 'dexie'
import { readAccount } from '@/db/repositories/account-repository'
import { balanceLabel,type Account } from '@/domain/finance/account'
import { formatMoney } from '@/lib/money'
export function AccountCard({projectId,customerId,title='خلاصه حساب'}:{projectId?:string;customerId?:string;title?:string}){
 const [account,setAccount]=useState<Account|null>(null);const [error,setError]=useState('')
 useEffect(()=>{const s=liveQuery(()=>readAccount(projectId,customerId)).subscribe({next:setAccount,error:()=>setError('خواندن حساب ناموفق بود.')});return()=>s.unsubscribe()},[projectId,customerId])
 return <section className="rounded-xl border bg-white p-4 space-y-3" aria-label={title}><h3 className="font-bold">{title}</h3>{error&&<p role="alert">{error}</p>}{account&&<><dl className="grid grid-cols-2 gap-3 text-sm">{[['قرارداد / اسناد مستقل',account.contract],['کار اضافه',account.changes],['تخفیف',account.discount],['جمع قابل دریافت',account.receivable],['دریافتی',account.received],['مانده حساب',Math.abs(account.balance)]].map(([label,value])=><div key={label}><dt className="text-slate-500">{label}</dt><dd className="font-bold break-words">{formatMoney(Number(value))}</dd></div>)}</dl><p className={account.balance>0?'text-rose-700':account.balance<0?'text-sky-700':'text-emerald-700'}>{balanceLabel(account.balance)}: {formatMoney(Math.abs(account.balance))}</p><p className="text-xs text-slate-500">حساب پروژه از قرارداد + کار اضافه − تخفیف − پرداخت محاسبه می‌شود. فاکتور پروژه این مبلغ را دوباره به حساب اضافه نمی‌کند.</p></>}{(projectId||customerId)&&<Link to="/finance" hash="payments" className="block min-h-11 text-indigo-700">ویرایش یا حذف پرداخت‌ها در مالی ← ریز دریافتی‌ها</Link>}</section>
}
