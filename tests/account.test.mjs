import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
const {outputText}=ts.transpileModule(readFileSync(new URL('../src/domain/finance/account.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}})
const {projectAccount,aggregateAccount,balanceLabel}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const project={id:'p',customerId:'c',status:'in_progress',contractAmount:20000000,discount:1000000}
const changes=[{projectId:'p',amount:3000000},{projectId:'other',amount:99000000}]
test('project debt, settlement and credit use contract, extras and discount exactly once',()=>{
 for(const [amount,balance,label] of [[10000000,12000000,'بدهکار'],[22000000,0,'تسویه‌شده'],[23000000,-1000000,'بستانکار']]){
  const account=projectAccount(project,changes,[{projectId:'p',amount},{projectId:'other',amount:90000000}])
  assert.equal(account.receivable,22000000);assert.equal(account.balance,balance);assert.equal(balanceLabel(account.balance),label)
 }
})
test('itemized projects use the live service total and only financial statuses create debt',()=>{
 const items=[{projectId:'p',totalPrice:12000000},{projectId:'p',totalPrice:6000000},{projectId:'other',totalPrice:99000000}]
 const itemized={...project,pricingMode:'itemized',contractAmount:50000000,discount:0}
 assert.equal(projectAccount(itemized,[],[],items).receivable,18000000)
 items[1].totalPrice=9000000
 assert.equal(projectAccount(itemized,[],[],items).receivable,21000000)
 for(const status of ['in_progress','paused','completed','delivered'])assert.equal(projectAccount({...itemized,status},[],[],items).receivable,21000000)
 for(const status of ['draft','planned','active','cancelled'])assert.equal(projectAccount({...itemized,status},[],[],items).receivable,0)
 assert.equal(projectAccount({...itemized,status:'cancelled'},[],[{projectId:'p',amount:2000}],items).balance,-2000)
})
test('priced activities replace the initial agreement and manual activity amounts override unit calculation',()=>{
 const items=[{id:'item',projectId:'p',unitPrice:150000,totalPrice:15000000}]
 assert.equal(projectAccount(project,changes,[],items,[]).receivable,22000000)
 const measured=[{projectId:'p',projectItemId:'item',quantity:106}]
 const account=projectAccount(project,changes,[],items,measured)
 assert.equal(account.source,'activities')
 assert.equal(account.contract,15900000)
 assert.equal(account.receivable,17900000)
 const corrected=projectAccount(project,changes,[],items,[{...measured[0],amount:17000000}])
 assert.equal(corrected.contract,17000000)
 assert.equal(corrected.receivable,19000000)
 assert.equal(projectAccount(project,changes,[],items,[]).source,'contract')
})
test('project invoices never duplicate debt; only standalone issued/paid invoices contribute',()=>{
 const invoices=['draft','issued','paid','void'].flatMap(status=>[{projectId:'p',customerId:'c',total:22000000,status},{customerId:'c',total:500,status}])
 invoices.push({customerId:'other',total:10000,status:'issued'})
 const account=aggregateAccount([project],changes,[{projectId:'p',customerId:'c',amount:10000000},{customerId:'c',amount:200},{customerId:'other',amount:700}],invoices,'c')
 assert.equal(account.receivable,22001000);assert.equal(account.received,10000200);assert.equal(account.balance,12000800)
})
