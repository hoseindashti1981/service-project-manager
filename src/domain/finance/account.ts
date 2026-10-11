import type { Project } from '@/domain/project/types'
import type { ProjectChange } from '@/domain/project-change/types'
import type { ProjectItem } from '@/domain/project-item/types'
import type { Invoice, Payment } from './types'
export interface Account { contract:number; changes:number; discount:number; receivable:number; received:number; balance:number; recognized?:boolean }
export const balanceLabel=(balance:number)=>balance>0?'بدهکار':balance<0?'بستانکار':'تسویه‌شده'
export const financialProjectStatuses = ['in_progress', 'paused', 'completed', 'delivered'] as const
export function isFinancialProject(project:Pick<Project,'status'>):boolean{return financialProjectStatuses.includes(project.status as (typeof financialProjectStatuses)[number])}
export function projectItemsTotal(projectId:string,items:ProjectItem[]):number{return items.filter(item=>item.projectId===projectId).reduce((sum,item)=>sum+item.totalPrice,0)}
export function projectBaseAmount(project:Project,items:ProjectItem[]):number{return (project.pricingMode??'fixed')==='itemized'?projectItemsTotal(project.id,items):project.contractAmount??0}
export function projectAccount(project:Project,changes:ProjectChange[],payments:Payment[],items:ProjectItem[]=[]):Account {
 const recognized=isFinancialProject(project)
 const contract=recognized?projectBaseAmount(project,items):0
 const extra=recognized?changes.filter(x=>x.projectId===project.id).reduce((s,x)=>s+x.amount,0):0
 const discount=recognized?(project.discount??0):0
 const received=payments.filter(x=>x.projectId===project.id).reduce((s,x)=>s+x.amount,0)
 const receivable=contract+extra-discount
 return {contract,changes:extra,discount,receivable,received,balance:receivable-received,recognized}
}
export function aggregateAccount(projects:Project[],changes:ProjectChange[],payments:Payment[],invoices:Invoice[],customerId?:string,items:ProjectItem[]=[]):Account {
 const selected=projects.filter(p=>!customerId||p.customerId===customerId)
 const ids=new Set(selected.map(p=>p.id))
 const accounts=selected.map(p=>projectAccount(p,changes,[],items))
 const standalone=invoices.filter(i=>!i.projectId&&['issued','paid'].includes(i.status)&&(!customerId||i.customerId===customerId)).reduce((s,i)=>s+i.total,0)
 const received=payments.filter(p=>!customerId|| (p.projectId&&ids.has(p.projectId)) || ((!p.projectId||!projects.some(project=>project.id===p.projectId))&&p.customerId===customerId)).reduce((s,p)=>s+p.amount,0)
 const contract=accounts.reduce((s,a)=>s+a.contract,0)+standalone
 const extra=accounts.reduce((s,a)=>s+a.changes,0)
 const discount=accounts.reduce((s,a)=>s+a.discount,0)
 return {contract,changes:extra,discount,receivable:contract+extra-discount,received,balance:contract+extra-discount-received}
}
export const paymentMethods={cash:'نقدی',card:'کارت‌به‌کارت',transfer:'واریز',cheque:'چک',other:'سایر'}
