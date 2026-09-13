import {MoneyInput} from '@/components/money-input'
import { useEffect,useState } from 'react'
import { liveQuery } from 'dexie'
import { db } from '@/db/db'
import { accountsData } from '@/db/repositories/account-repository'
import { AccountCard } from './account-card'
import { paymentMethods } from '@/domain/finance/account'
import {formatDateFa} from '@/lib/dates'
import {formatMoney} from '@/lib/money'
import type {Payment} from '@/domain/finance/types'
export function ProjectAccountDetails({projectId}:{projectId:string}){
 const [payments,setPayments]=useState<Payment[]>([]),[discount,setDiscount]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 useEffect(()=>{const s=liveQuery(async()=>(await accountsData()).payments.filter(p=>p.projectId===projectId).sort((a,b)=>b.date.localeCompare(a.date))).subscribe(setPayments);void db.projects.get(projectId).then(p=>setDiscount(String(p?.discount??0)));return()=>s.unsubscribe()},[projectId])
 return <div className="space-y-3"><AccountCard projectId={projectId} title="حساب پروژه"/><form className="rounded-xl border bg-white p-3 space-y-2" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{const amount=Number(discount);await db.transaction('rw',db.projects,db.projectChanges,async()=>{const project=await db.projects.get(projectId);if(!project)throw Error('پروژه یافت نشد.');const extra=(await db.projectChanges.where('projectId').equals(projectId).toArray()).reduce((s,x)=>s+x.amount,0);if(!Number.isSafeInteger(amount)||amount<0||amount>(project.contractAmount??0)+extra)throw Error('تخفیف باید بین صفر و مبلغ قرارداد و کار اضافه باشد.');await db.projects.update(projectId,{discount:amount,updatedAt:Date.now()})})}catch(e){setError(String(e))}finally{setBusy(false)}}}><label>تخفیف پروژه (تومان)<MoneyInput aria-label="تخفیف پروژه" type="number" min="0" className="w-full border rounded p-2" value={discount} onChange={e=>setDiscount(e.target.value)}/></label><button disabled={busy} className="min-h-11 rounded border px-3">ذخیره تخفیف</button>{error&&<p role="alert">{error}</p>}</form><details className="border rounded-xl bg-white p-3" open><summary className="min-h-11 font-bold">ریز پرداخت‌های پروژه</summary>{payments.length===0?<p>پرداختی ثبت نشده است.</p>:payments.map(p=><p key={p.id} className="border-t py-3 text-sm">دریافت {formatMoney(p.amount)} · {formatDateFa(p.date)} · {paymentMethods[p.method]}{p.note&&<span className="block">{p.note}</span>}</p>)}</details></div>
}
