import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
const {outputText}=ts.transpileModule(readFileSync(new URL('../src/domain/finance/account.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}})
const {projectAccount,aggregateAccount,balanceLabel}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const project={id:'p',customerId:'c',contractAmount:20000000,discount:1000000}
const changes=[{projectId:'p',amount:3000000},{projectId:'other',amount:99000000}]
test('project debt, settlement and credit use contract, extras and discount exactly once',()=>{
 for(const [amount,balance,label] of [[10000000,12000000,'بدهکار'],[22000000,0,'تسویه‌شده'],[23000000,-1000000,'بستانکار']]){
  const account=projectAccount(project,changes,[{projectId:'p',amount},{projectId:'other',amount:90000000}])
  assert.equal(account.receivable,22000000);assert.equal(account.balance,balance);assert.equal(balanceLabel(account.balance),label)
 }
})
test('project invoices never duplicate debt; only standalone issued/paid invoices contribute',()=>{
 const invoices=['draft','issued','paid','void'].flatMap(status=>[{projectId:'p',customerId:'c',total:22000000,status},{customerId:'c',total:500,status}])
 invoices.push({customerId:'other',total:10000,status:'issued'})
 const account=aggregateAccount([project],changes,[{projectId:'p',customerId:'c',amount:10000000},{customerId:'c',amount:200},{customerId:'other',amount:700}],invoices,'c')
 assert.equal(account.receivable,22001000);assert.equal(account.received,10000200);assert.equal(account.balance,12000800)
})
