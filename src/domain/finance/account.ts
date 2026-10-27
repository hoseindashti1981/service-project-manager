import type { Project } from '@/domain/project/types'
import type { ProjectChange } from '@/domain/project-change/types'
import type { ProjectItem } from '@/domain/project-item/types'
import type { ProjectActivity } from '@/domain/activity/types'
import type { Invoice, Payment } from './types'
export type AccountSource='contract'|'services'|'activities'|'aggregate'
export interface Account { contract:number; changes:number; discount:number; receivable:number; received:number; balance:number; recognized?:boolean; source?:AccountSource }
export const balanceLabel=(balance:number)=>balance>0?'بدهکار':balance<0?'بستانکار':'تسویه‌شده'
export const financialProjectStatuses = ['in_progress', 'paused', 'completed', 'delivered'] as const
export function isFinancialProject(project:Pick<Project,'status'>):boolean{return financialProjectStatuses.includes(project.status as (typeof financialProjectStatuses)[number])}
export function projectItemsTotal(projectId:string,items:ProjectItem[]):number{return items.filter(item=>item.projectId===projectId).reduce((sum,item)=>sum+item.totalPrice,0)}
export function activityPrice(activity:ProjectActivity,items:ProjectItem[]):number|undefined{
 if(activity.amount!==undefined&&activity.amount>0)return activity.amount
 if(activity.quantity===undefined||!activity.projectItemId)return undefined
 const item=items.find(row=>row.id===activity.projectItemId&&row.projectId===activity.projectId)
 const amount=item?Math.round(activity.quantity*item.unitPrice):0
 return amount>0?amount:undefined
}
export function projectActivityTotal(projectId:string,items:ProjectItem[],activities:ProjectActivity[]):number|undefined{
 const amounts=activities.filter(activity=>activity.projectId===projectId).map(activity=>activityPrice(activity,items)).filter((amount):amount is number=>amount!==undefined)
 return amounts.length?amounts.reduce((sum,amount)=>sum+amount,0):undefined
}
export function projectBase(project:Project,items:ProjectItem[],activities:ProjectActivity[]=[]):{amount:number;source:Exclude<AccountSource,'aggregate'>}{
 const actual=projectActivityTotal(project.id,items,activities)
 if(actual!==undefined)return {amount:actual,source:'activities'}
 if((project.pricingMode??'fixed')==='itemized')return {amount:projectItemsTotal(project.id,items),source:'services'}
 return {amount:project.contractAmount??0,source:'contract'}
}
export function projectBaseAmount(project:Project,items:ProjectItem[],activities:ProjectActivity[]=[]):number{return projectBase(project,items,activities).amount}
export function projectAccount(project:Project,changes:ProjectChange[],payments:Payment[],items:ProjectItem[]=[],activities:ProjectActivity[]=[]):Account {
 const recognized=isFinancialProject(project)
 const base=projectBase(project,items,activities)
 const contract=recognized?base.amount:0
 const extra=recognized?changes.filter(x=>x.projectId===project.id).reduce((s,x)=>s+x.amount,0):0
 const discount=recognized?Math.min(project.discount??0,contract+extra):0
 const received=payments.filter(x=>x.projectId===project.id).reduce((s,x)=>s+x.amount,0)
 const receivable=contract+extra-discount
 return {contract,changes:extra,discount,receivable,received,balance:receivable-received,recognized,source:base.source}
}
export function aggregateAccount(projects:Project[],changes:ProjectChange[],payments:Payment[],invoices:Invoice[],customerId?:string,items:ProjectItem[]=[],activities:ProjectActivity[]=[]):Account {
 const selected=projects.filter(p=>!customerId||p.customerId===customerId)
 const ids=new Set(selected.map(p=>p.id))
 const accounts=selected.map(p=>projectAccount(p,changes,[],items,activities))
 const standalone=invoices.filter(i=>!i.projectId&&['issued','paid'].includes(i.status)&&(!customerId||i.customerId===customerId)).reduce((s,i)=>s+i.total,0)
 const received=payments.filter(p=>!customerId|| (p.projectId&&ids.has(p.projectId)) || ((!p.projectId||!projects.some(project=>project.id===p.projectId))&&p.customerId===customerId)).reduce((s,p)=>s+p.amount,0)
 const contract=accounts.reduce((s,a)=>s+a.contract,0)+standalone
 const extra=accounts.reduce((s,a)=>s+a.changes,0)
 const discount=accounts.reduce((s,a)=>s+a.discount,0)
 return {contract,changes:extra,discount,receivable:contract+extra-discount,received,balance:contract+extra-discount-received,source:'aggregate'}
}
export const paymentMethods={cash:'نقدی',card:'کارت‌به‌کارت',transfer:'واریز',cheque:'چک',other:'سایر'}
