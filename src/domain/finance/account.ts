import type { Project } from '@/domain/project/types'
import type { ProjectChange } from '@/domain/project-change/types'
import type { Invoice, Payment } from './types'
export interface Account { contract:number; changes:number; discount:number; receivable:number; received:number; balance:number }
export const balanceLabel=(balance:number)=>balance>0?'بدهکار':balance<0?'بستانکار':'تسویه‌شده'
export function projectAccount(project:Project,changes:ProjectChange[],payments:Payment[]):Account {
 const contract=project.contractAmount??0
 const extra=changes.filter(x=>x.projectId===project.id).reduce((s,x)=>s+x.amount,0)
 const discount=project.discount??0
 const received=payments.filter(x=>x.projectId===project.id).reduce((s,x)=>s+x.amount,0)
 const receivable=contract+extra-discount
 return {contract,changes:extra,discount,receivable,received,balance:receivable-received}
}
export function aggregateAccount(projects:Project[],changes:ProjectChange[],payments:Payment[],invoices:Invoice[],customerId?:string):Account {
 const selected=projects.filter(p=>!customerId||p.customerId===customerId)
 const ids=new Set(selected.map(p=>p.id))
 const accounts=selected.map(p=>projectAccount(p,changes,[]))
 const standalone=invoices.filter(i=>!i.projectId&&['issued','paid'].includes(i.status)&&(!customerId||i.customerId===customerId)).reduce((s,i)=>s+i.total,0)
 const received=payments.filter(p=>!customerId|| (p.projectId&&ids.has(p.projectId)) || ((!p.projectId||!projects.some(project=>project.id===p.projectId))&&p.customerId===customerId)).reduce((s,p)=>s+p.amount,0)
 const contract=accounts.reduce((s,a)=>s+a.contract,0)+standalone
 const extra=accounts.reduce((s,a)=>s+a.changes,0)
 const discount=accounts.reduce((s,a)=>s+a.discount,0)
 return {contract,changes:extra,discount,receivable:contract+extra-discount,received,balance:contract+extra-discount-received}
}
export const paymentMethods={cash:'نقدی',card:'کارت‌به‌کارت',transfer:'واریز',cheque:'چک',other:'سایر'}
