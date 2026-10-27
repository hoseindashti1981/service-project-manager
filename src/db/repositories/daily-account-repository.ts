import {accountsData} from './account-repository'
import {toISODate} from '@/lib/dates'
import {activityPrice,isFinancialProject,projectBase,projectAccount} from '@/domain/finance/account'
export async function readDailyAccount(date:string){
 const {projects,changes,payments,invoices,items,activities}=await accountsData()
 const recognized=projects.filter(isFinancialProject)
 const contract=recognized.reduce((sum,project)=>{
  const base=projectBase(project,items,activities)
  if(base.source==='activities'){
   const priced=activities.filter(activity=>activity.projectId===project.id&&activityPrice(activity,items)!==undefined)
   const daily=priced.filter(activity=>activity.date===date).reduce((total,activity)=>total+(activityPrice(activity,items)??0),0)
   const firstDate=priced.map(activity=>activity.date).sort()[0]
   const appliedDiscount=projectAccount(project,changes,[],items,activities).discount
   return sum+daily-(firstDate===date?appliedDiscount:0)
  }
  return sum+((project.agreementDate||project.startDate||toISODate(new Date(project.createdAt)))===date?base.amount-projectAccount(project,changes,[],items,activities).discount:0)
 },0)
 const projectIds=new Set(recognized.map(p=>p.id))
 const extras=changes.filter(c=>c.date===date&&projectIds.has(c.projectId)).reduce((sum,c)=>sum+c.amount,0)
 const standalone=invoices.filter(i=>!i.projectId&&i.date===date&&['issued','paid'].includes(i.status)).reduce((sum,i)=>sum+i.total,0)
 const received=payments.filter(p=>p.date===date).reduce((sum,p)=>sum+p.amount,0)
 return {receivable:contract+extras+standalone,received,balance:contract+extras+standalone-received}
}
