import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import {backupFixture} from './backup-fixtures.mjs'
function url(path,imports={}) {
 let {outputText}=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}})
 for(const [key,value] of Object.entries(imports)) outputText=outputText.replaceAll(`'${key}'`,`'${value}'`)
 return `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
}
const {parseBackup,createBackup,inspectBackup}=await import(url('../src/domain/backup/validation.ts',{'@/lib/dates':url('../src/lib/dates.ts'),'./types':url('../src/domain/backup/types.ts')}))
const legacy=data=>({version:1,exportedAt:'2025-01-05T12:00:00.000Z',data})
test('version 2 survives JSON roundtrip including all twelve tables and audit snapshots',async()=>{
 const source=backupFixture()
 const backup=await createBackup(source)
 const preview=await inspectBackup(JSON.parse(JSON.stringify(backup,null,2)))
 assert.deepEqual(preview.data,source); assert.equal(Object.keys(preview.counts).length,12); assert.equal(preview.counts.reminders,1); assert.equal(preview.warnings.length,0)
})
test('valid-shape modification is detected by checksum, while key order is immaterial',async()=>{
 const backup=await createBackup(backupFixture())
 const reordered=Object.fromEntries(Object.entries(backup).reverse())
 await inspectBackup(reordered)
 const damaged=structuredClone(backup); damaged.data.customers[0].name='تغییر'
 await assert.rejects(inspectBackup(damaged),/تغییر کرده/)
 const missing=structuredClone(backup); delete missing.checksum
 await assert.rejects(inspectBackup(missing),/یکپارچگی/)
})
test('legacy backups missing reminders have explicit empty-table and integrity warnings',()=>{
 const data=backupFixture(); delete data.reminders; delete data.services[0].defaultUnitPrice
 const preview=parseBackup(legacy(data))
 assert.deepEqual(preview.data.reminders,[]); assert.equal(preview.data.services[0].defaultUnitPrice,undefined)
 assert.ok(preview.warnings.some(w=>w.includes('یادآور'))); assert.ok(preview.warnings.some(w=>w.includes('یکپارچگی')))
})
test('unsupported versions, missing tables and unknown tables are never silently accepted',()=>{
 assert.throws(()=>parseBackup({...legacy(backupFixture()),version:99}))
 const missing=backupFixture(); delete missing.projects; assert.throws(()=>parseBackup(legacy(missing)))
 const unknown=backupFixture(); unknown.photos=[]; assert.throws(()=>parseBackup(legacy(unknown)))
})
test('duplicate identifiers and invalid dates, enums and financial totals are rejected',()=>{
 for(const mutate of [data=>data.customers.push({...data.customers[0]}),data=>data.payments[0].amount=-1,data=>data.projects[0].status='unknown',data=>data.reminders[0].dueDate='2025-02-30',data=>data.invoices[0].total=999,data=>data.projectItems[0].unitPrice=NaN,data=>data.customers[0].createdAt='yesterday']) {
  const data=backupFixture();mutate(data);assert.throws(()=>parseBackup(legacy(data)))
 }
})
test('invalid nested history and cross-project activity links are rejected',()=>{
 const data=backupFixture();data.projects[0].activityAudit[0].after.projectId='other';assert.throws(()=>parseBackup(legacy(data)))
 const history=backupFixture();history.projects[0].statusHistory[0].effectiveDate='bad';assert.throws(()=>parseBackup(legacy(history)))
 const cross=backupFixture();cross.projectItems[0].projectId='other';assert.throws(()=>parseBackup(legacy(cross)))
})
test('legacy orphan references are preserved with warnings instead of dropping records',()=>{
 const data=backupFixture();data.customers=[]
 const preview=parseBackup(legacy(data));assert.equal(preview.data.projects.length,1);assert.ok(preview.warnings.some(w=>w.includes('حذف‌شده')))
})
test('an empty full backup is valid and contains explicit counts for every table',async()=>{
 const data=Object.fromEntries(Object.keys(backupFixture()).map(key=>[key,[]]))
 const preview=await inspectBackup(await createBackup(data));assert.ok(Object.values(preview.counts).every(value=>value===0))
})
