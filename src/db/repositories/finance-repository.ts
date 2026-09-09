import {savePayment,deletePayment} from './payment-mutations'
import { requireDate } from '@/lib/dates'
import { db } from '@/db/db'
import { readAccount } from './account-repository'
import type { CreateInvoiceInput,CreateQuotationInput,Invoice,Quotation } from '@/domain/finance/types'
const money=(n:number)=>{if(!Number.isSafeInteger(n)||n<0)throw Error('مبلغ باید صحیح و نامنفی باشد.');return n}
async function links(customerId:string,projectId?:string){if(!await db.customers.get(customerId))throw Error('مشتری یافت نشد.');if(projectId&&(await db.projects.get(projectId))?.customerId!==customerId)throw Error('پروژه متعلق به مشتری نیست.')}
async function save(kind:'invoice'|'quotation',input:CreateInvoiceInput|CreateQuotationInput,id?:string){return db.transaction('rw',db.invoices,db.quotations,db.projects,db.customers,db.payments,async()=>{
 requireDate(input.date);if(input.dueDate)requireDate(input.dueDate);await links(input.customerId,input.projectId)
 const table=kind==='invoice'?db.invoices:db.quotations,old=id?await table.get(id):undefined
 if(id&&!old)throw Error('سند یافت نشد.');if(old&&['void','paid'].includes(old.status))throw Error('سند تسویه یا باطل‌شده قابل ویرایش نیست.')
 if(kind==='invoice'&&old&&await db.payments.where('invoiceId').equals(old.id).count())throw Error('فاکتور دارای پرداخت قابل ویرایش نیست؛ ابتدا مغایرت پرداخت را بررسی کنید.')
 if(kind==='invoice'&&'quotationId' in input&&input.quotationId){const q=await db.quotations.get(input.quotationId);if(!q||q.customerId!==input.customerId||q.projectId!==input.projectId)throw Error('پیش‌فاکتور متعلق به همین مشتری و پروژه نیست.')}
 if(!(kind==='invoice'?['draft','issued']:['draft','sent','accepted','rejected']).includes(input.status))throw Error('وضعیت نامعتبر است.')
 if(!input.lines.length)throw Error('حداقل یک ردیف لازم است.')
 const lines=input.lines.map(l=>{if(!l.description.trim()||!Number.isFinite(l.quantity)||l.quantity<=0)throw Error('شرح و مقدار ردیف معتبر نیست.');money(l.unitPrice);return {...l,id:l.id||crypto.randomUUID(),total:money(Math.round(l.quantity*l.unitPrice))}})
 const discount=money(input.discount??0),tax=money(input.tax??0),extraFee=money(input.extraFee??0),subtotal=money(lines.reduce((s,l)=>s+l.total,0))
 if(discount>subtotal)throw Error('تخفیف از جمع ردیف‌ها بیشتر است.')
 const total=money(subtotal-discount+tax+extraFee),prefix=(kind==='invoice'?'INV':'Q')+'-'+new Intl.DateTimeFormat('en',{year:'numeric',calendar:'persian'}).format(new Date()).replace(/[^0-9]/g,'')+'-'
 const all=await table.toArray(),number=old?.number??prefix+String(Math.max(0,...all.filter(x=>x.number.startsWith(prefix)).map(x=>Number(x.number.slice(prefix.length))||0))+1).padStart(4,'0')
 const doc={...input,lines,total,discount,tax,extraFee,id:old?.id??crypto.randomUUID(),number,createdAt:old?.createdAt??Date.now(),updatedAt:Date.now()}
 if(kind==='invoice')await db.invoices.put(doc as Invoice);else await db.quotations.put(doc as Quotation);return doc
})}
export const financeRepository={
 createInvoice:(input:CreateInvoiceInput)=>save('invoice',input) as Promise<Invoice>,createQuotation:(input:CreateQuotationInput)=>save('quotation',input) as Promise<Quotation>,
 updateInvoice:(id:string,input:CreateInvoiceInput)=>save('invoice',input,id) as Promise<Invoice>,updateQuotation:(id:string,input:CreateQuotationInput)=>save('quotation',input,id) as Promise<Quotation>,
 async voidInvoice(id:string,reason?:string){const old=await db.invoices.get(id);if(!old)throw Error('فاکتور یافت نشد.');if(!reason?.trim())throw Error('دلیل ابطال لازم است.');const next={...old,status:'void' as const,voidReason:reason,updatedAt:Date.now()};await db.invoices.put(next);return next},
 createPayment:savePayment,updatePayment:savePayment,deletePayment,
 getQuotations:()=>db.quotations.orderBy('createdAt').reverse().toArray(),getInvoices:()=>db.invoices.orderBy('createdAt').reverse().toArray(),getPayments:()=>db.payments.orderBy('date').reverse().toArray(),
 balanceForProject:async(id:string)=>(await readAccount(id)).balance,balanceForCustomer:async(id:string)=>(await readAccount(undefined,id)).balance,
}
