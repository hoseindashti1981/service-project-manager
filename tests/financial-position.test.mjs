import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'

const {outputText}=ts.transpileModule(readFileSync(new URL('../src/domain/finance/financial-position.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}})
const {projectFinancialPosition,aggregateFinancialPositions,accountingStage}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

const project={id:'p',customerId:'c',title:'پروژه',status:'in_progress',pricingMode:'itemized',initialEstimateAmount:15000000,discount:1000000}
const items=[{id:'i',projectId:'p',quantity:100,unitPrice:150000,totalPrice:15000000}]

test('forecast, performed work, issued debt and payments remain separate',()=>{
 const position=projectFinancialPosition({
  project,
  items,
  activities:[{projectId:'p',projectItemId:'i',quantity:40}],
  changes:[{projectId:'p',amount:2000000}],
  invoices:[{id:'inv',projectId:'p',status:'issued',total:5000000}],
  payments:[{projectId:'p',invoiceId:'inv',amount:3000000}],
  expenses:[{projectId:'p',amount:500000}],
  materials:[{projectId:'p',source:'contractor',cost:250000},{projectId:'p',source:'customer',cost:900000}],
 })
 assert.equal(position.currentEstimate,15000000)
 assert.equal(position.forecastNet,16000000)
 assert.equal(position.performedBase,6000000)
 assert.equal(position.performedGross,8000000)
 assert.equal(position.allocatedDiscount,470588)
 assert.equal(position.earnedNet,7529412)
 assert.equal(position.invoiced,5000000)
 assert.equal(position.unbilledEarned,2529412)
 assert.equal(position.received,3000000)
 assert.equal(position.outstanding,2000000)
 assert.equal(position.costs,750000)
})

test('draft invoices and quotations do not create receivables',()=>{
 const position=projectFinancialPosition({project,items,invoices:[{id:'draft',projectId:'p',status:'draft',total:9000000}]})
 assert.equal(position.invoiced,0)
 assert.equal(position.outstanding,0)
})

test('overpayment becomes customer credit and is not negative revenue',()=>{
 const position=projectFinancialPosition({project,items,invoices:[{id:'inv',projectId:'p',status:'paid',total:5000000}],payments:[{invoiceId:'inv',amount:6000000}]})
 assert.equal(position.balance,-1000000)
 assert.equal(position.outstanding,0)
 assert.equal(position.credit,1000000)
})

test('status policy preserves actual documents without turning estimates into debt',()=>{
 assert.equal(accountingStage('planned'),'forecast')
 assert.equal(accountingStage('paused'),'paused')
 assert.equal(accountingStage('completed'),'finalizable')
 assert.equal(accountingStage('delivered'),'finalized')
 assert.equal(accountingStage('cancelled'),'cancelled')
 const cancelled=projectFinancialPosition({project:{...project,status:'cancelled'},items,invoices:[{id:'inv',projectId:'p',status:'issued',total:1000000}]})
 assert.equal(cancelled.currentEstimate,15000000)
 assert.equal(cancelled.invoiced,1000000)
 assert.equal(cancelled.finalizationCandidate,0)
})

test('delivered unbilled work is reported as a reconciliation warning',()=>{
 const position=projectFinancialPosition({project:{...project,status:'delivered'},items,activities:[{projectId:'p',projectItemId:'i',quantity:100}]})
 assert.equal(position.finalizationCandidate,14000000)
 assert.equal(position.unbilledEarned,14000000)
 assert.deepEqual(position.warnings,['delivered-with-unbilled-balance'])
})

test('completed unbilled work and over-invoicing are explicit reconciliation warnings',()=>{
 const completed=projectFinancialPosition({project:{...project,status:'completed'},items,activities:[{projectId:'p',projectItemId:'i',quantity:50}],invoices:[{id:'inv',projectId:'p',status:'issued',total:8000000}]})
 assert.deepEqual(completed.warnings,['invoice-exceeds-earned-work'])
 const unbilled=projectFinancialPosition({project:{...project,status:'completed'},items,activities:[{projectId:'p',projectItemId:'i',quantity:50}],invoices:[{id:'inv',projectId:'p',status:'issued',total:1000000}]})
 assert.deepEqual(unbilled.warnings,['completed-with-unbilled-balance'])
})

test('aggregate totals keep debt, credit and profit independently visible',()=>{
 const first=projectFinancialPosition({project,items,invoices:[{id:'a',projectId:'p',status:'issued',total:5000}],payments:[{invoiceId:'a',amount:3000}]})
 const second=projectFinancialPosition({project:{...project,id:'p2'},items:[],invoices:[{id:'b',projectId:'p2',status:'paid',total:2000}],payments:[{invoiceId:'b',amount:2500}]})
 const total=aggregateFinancialPositions([first,second],{
  invoices:[{id:'standalone',status:'issued',total:4000}],
  payments:[{invoiceId:'standalone',amount:1000}],
 })
 assert.equal(total.projectCount,2)
 assert.equal(total.invoiced,11000)
 assert.equal(total.received,6500)
 assert.equal(total.outstanding,5000)
 assert.equal(total.credit,500)
 assert.equal(total.balance,4500)
})
