import {accountsData} from './account-repository'
import {toISODate} from '@/lib/dates'
import {isFinancialProject,projectBaseAmount} from '@/domain/finance/account'
export async function readDailyAccount(date:string){
 const {projects,changes,payments,invoices,items}=await accountsData()
 const recognized=projects.filter(isFinancialProject)
 const contract=recognized.filter(p=>(p.agreementDate||p.startDate||toISODate(new Date(p.createdAt)))===date).reduce((sum,p)=>sum+projectBaseAmount(p,items)-(p.discount??0),0)
 const projectIds=new Set(recognized.map(p=>p.id))
 const extras=changes.filter(c=>c.date===date&&projectIds.has(c.projectId)).reduce((sum,c)=>sum+c.amount,0)
 const standalone=invoices.filter(i=>!i.projectId&&i.date===date&&['issued','paid'].includes(i.status)).reduce((sum,i)=>sum+i.total,0)
 const received=payments.filter(p=>p.date===date).reduce((sum,p)=>sum+p.amount,0)
 return {receivable:contract+extras+standalone,received,balance:contract+extras+standalone-received}
}
