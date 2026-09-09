import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
const {chromium}=await import(pathToFileURL(process.env.SPM_PLAYWRIGHT_PATH).href)
const browser=await chromium.launch({channel:'msedge'})
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5173/')
 const result=await page.evaluate(async()=>{
  const {db}=await import('/src/db/db.ts'),{backupFixture}=await import('/tests/backup-fixtures.mjs'),{savePayment,deletePayment}=await import('/src/db/repositories/payment-mutations.ts'),d=backupFixture()
  await db.transaction('rw',db.tables,async()=>{for(const [name,rows] of Object.entries(d))await db.table(name).bulkPut(rows)})
  const original=await db.payments.get('pay1'),invoice=await db.invoices.get('i1')
  await db.invoices.put({...invoice,id:'i2',number:'TEST-2',status:'issued'})
  const paid=await savePayment({...original,amount:100},original.id,original.updatedAt)
  const moved=await savePayment({...paid,invoiceId:'i2'},paid.id,paid.updatedAt)
  const statuses=[(await db.invoices.get('i1')).status,(await db.invoices.get('i2')).status]
  let stale=false;try{await savePayment({...paid,amount:2},paid.id,paid.updatedAt)}catch{stale=true}
  const retained=(await db.payments.get(paid.id)).amount
  await deletePayment(moved.id,moved.updatedAt)
  return {statuses,stale,retained,afterDelete:(await db.invoices.get('i2')).status,count:await db.payments.count()}
 });assert.deepEqual(result,{statuses:['issued','paid'],stale:true,retained:100,afterDelete:'issued',count:0})
 console.log('Moving payments reconciles both invoices; stale writes rejected; deletion recalculates settlement.')
}finally{await browser.close()}
