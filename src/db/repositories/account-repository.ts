import { db } from '@/db/db'
import { aggregateAccount,projectAccount } from '@/domain/finance/account'
export async function accountsData(){const [projects,changes,payments,invoices,items,activities]=await Promise.all([db.projects.toArray(),db.projectChanges.toArray(),db.payments.toArray(),db.invoices.toArray(),db.projectItems.toArray(),db.projectActivities.toArray()]);return {projects,changes,payments:payments.map(p=>({...p,projectId:p.projectId??invoices.find(i=>i.id===p.invoiceId&&i.customerId===p.customerId)?.projectId})),invoices,items,activities}}
export async function readAccount(projectId?:string,customerId?:string){
 const data=await accountsData()
 if(projectId){const project=data.projects.find(p=>p.id===projectId);if(!project)throw Error('پروژه یافت نشد.');return projectAccount(project,data.changes,data.payments,data.items,data.activities)}
 return aggregateAccount(data.projects,data.changes,data.payments,data.invoices,customerId,data.items,data.activities)
}
