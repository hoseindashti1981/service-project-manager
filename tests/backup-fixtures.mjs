export function backupFixture() {
 const time=1700000000000
 const base = id => ({ id,createdAt:time,updatedAt:time })
 const activity={ ...base('a1'),projectId:'p1',projectItemId:'pi1',date:'2025-01-02',title:'نصب چراغ',quantity:1,unit:'piece' }
 return {
  customers:[{...base('c1'),name:'مشتری پشتیبان',mobile:'09123456789'}],
  projects:[{...base('p1'),customerId:'c1',title:'پروژه پشتیبان',status:'in_progress',startDate:'2025-01-01',executionStartDate:'2025-01-01',contractAmount:100,
   statusHistory:[{id:'h1',kind:'status',from:null,to:'in_progress',effectiveDate:'2025-01-01',recordedAt:time,datesAfter:{executionStartDate:'2025-01-01'}}],
   activityAudit:[{id:'audit1',activityId:'a1',action:'create',after:activity,recordedAt:time}]}],
  services:[{...base('s1'),name:'چراغ',defaultUnit:'piece',defaultUnitPrice:100,isActive:true}],
  projectItems:[{...base('pi1'),projectId:'p1',serviceId:'s1',title:'چراغ',unit:'piece',quantity:2,unitPrice:100,totalPrice:200,pricingType:'PER_UNIT'}],
  projectActivities:[activity],
  projectChanges:[{...base('change1'),projectId:'p1',title:'کار اضافه',amount:10,date:'2025-01-02'}],
  materials:[{...base('m1'),projectId:'p1',title:'چراغ',quantity:1,unit:'piece',cost:20,source:'contractor'}],
  expenses:[{...base('e1'),projectId:'p1',title:'رفت و آمد',amount:5,date:'2025-01-02'}],
  quotations:[{...base('q1'),customerId:'c1',projectId:'p1',number:'Q-1403-0001',date:'2025-01-02',status:'draft',lines:[{id:'ql1',description:'چراغ',quantity:1,unitPrice:100,total:100}],total:100}],
  invoices:[{...base('i1'),customerId:'c1',projectId:'p1',quotationId:'q1',number:'INV-1403-0001',date:'2025-01-02',status:'issued',lines:[{id:'il1',description:'چراغ',quantity:1,unitPrice:100,total:100}],total:100}],
  payments:[{...base('pay1'),customerId:'c1',projectId:'p1',invoiceId:'i1',amount:50,date:'2025-01-02',method:'cash'}],
  reminders:[{...base('r1'),projectId:'p1',title:'پیگیری پرداخت',dueDate:'2025-01-03',status:'open'}],
 }
}
