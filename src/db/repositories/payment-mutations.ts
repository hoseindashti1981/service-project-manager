import {db} from '@/db/db'
import {requireDate} from '@/lib/dates'
import type {CreatePaymentInput,Payment} from '@/domain/finance/types'
async function reconcile(id?:string){if(!id)return;const invoice=await db.invoices.get(id);if(!invoice||!['issued','paid'].includes(invoice.status))return;const total=(await db.payments.where('invoiceId').equals(id).toArray()).reduce((s,p)=>s+p.amount,0);await db.invoices.update(id,{status:total>=invoice.total?'paid':'issued',updatedAt:Date.now()})}
export async function savePayment(input:CreatePaymentInput,id?:string,expected?:number):Promise<Payment>{return db.transaction('rw',db.payments,db.invoices,db.projects,db.customers,async()=>{
 const old=id?await db.payments.get(id):undefined;if(id&&!old)throw Error('پرداخت یافت نشد.');if(old&&expected!==undefined&&old.updatedAt!==expected)throw Error('پرداخت تغییر کرده؛ دوباره باز کنید.')
 requireDate(input.date);if(!Number.isSafeInteger(input.amount)||input.amount<=0)throw Error('مبلغ پرداخت باید صحیح و مثبت باشد.');if(!['cash','card','transfer','cheque','other'].includes(input.method))throw Error('روش پرداخت نامعتبر است.')
 if(!await db.customers.get(input.customerId))throw Error('مشتری یافت نشد.')
 let projectId=input.projectId;const invoice=input.invoiceId?await db.invoices.get(input.invoiceId):undefined
 if(input.invoiceId&&(!invoice||invoice.customerId!==input.customerId||(['void','draft'].includes(invoice.status)&&old?.invoiceId!==input.invoiceId)))throw Error('فاکتور معتبر همین مشتری را انتخاب کنید.')
 if(invoice){if(projectId&&projectId!==invoice.projectId)throw Error('پروژه پرداخت و فاکتور یکسان نیست.');projectId=invoice.projectId}
 if(projectId&&(await db.projects.get(projectId))?.customerId!==input.customerId)throw Error('پروژه متعلق به مشتری نیست.')
 const payment={customerId:input.customerId,projectId,invoiceId:input.invoiceId,amount:input.amount,date:input.date,method:input.method,note:input.note,id:old?.id||crypto.randomUUID(),createdAt:old?.createdAt||Date.now(),updatedAt:Math.max(Date.now(),(old?.updatedAt||0)+1)}
 await db.payments.put(payment);await reconcile(old?.invoiceId);if(input.invoiceId!==old?.invoiceId)await reconcile(input.invoiceId);return payment
})}
export async function deletePayment(id:string,expected?:number){return db.transaction('rw',db.payments,db.invoices,async()=>{const old=await db.payments.get(id);if(!old)throw Error('پرداخت یافت نشد.');if(expected!==undefined&&old.updatedAt!==expected)throw Error('پرداخت تغییر کرده؛ دوباره بررسی کنید.');await db.payments.delete(id);await reconcile(old.invoiceId)})}
