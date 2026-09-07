import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import {createHash} from 'node:crypto'
import {backupFixture} from './backup-fixtures.mjs'
function url(path,imports={}) {
 let {outputText}=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}})
 for(const [key,value] of Object.entries(imports)) outputText=outputText.replaceAll(`'${key}'`,`'${value}'`)
 return `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
}
const {parseBackup,createBackup,inspectBackup}=await import(url('../src/domain/backup/validation.ts',{'@/lib/dates':url('../src/lib/dates.ts'),'./types':url('../src/domain/backup/types.ts')}))
const legacy=data=>({version:1,exportedAt:'2025-01-05T12:00:00.000Z',data})

test('version 2 checksum is verified before adding empty media and settings tables',async()=>{
 const data=backupFixture();delete data.photos;delete data.appSettings
 const payload={format:'lineyar-backup',version:2,exportedAt:'2025-01-05T12:00:00.000Z',data}
 const canonical=JSON.stringify(payload,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v)
 const backup={...payload,checksum:{algorithm:'SHA-256',value:createHash('sha256').update(canonical).digest('hex')}}
 const preview=await inspectBackup(backup)
 assert.deepEqual(preview.data.photos,[]);assert.deepEqual(preview.data.appSettings,[]);assert.ok(preview.warnings.length>0)
 backup.data.customers[0].name='tampered';await assert.rejects(inspectBackup(backup))
})

test('invalid media, theme and excessive project discounts cannot enter through restore',()=>{
 for(const change of [data=>data.photos.push({id:'photo',projectId:'p1',date:'2025-01-05',title:'test',dataUrl:'javascript:alert(1)',thumbnail:'bad',bytes:1,createdAt:1,updatedAt:1}),data=>data.projects[0].discount=999999999,data=>data.appSettings.push({id:'business',name:'x',phone:'',address:'',color:'red;display:none',paymentInfo:'',createdAt:1,updatedAt:1})]){
  const data=backupFixture();change(data);assert.throws(()=>parseBackup(legacy(data)))
 }
})
test('version 3 survives JSON roundtrip including fourteen tables and audit snapshots',async()=>{
 const source=backupFixture()
 const backup=await createBackup(source)
 const preview=await inspectBackup(JSON.parse(JSON.stringify(backup,null,2)))
 assert.deepEqual(preview.data,source); assert.equal(Object.keys(preview.counts).length,14); assert.equal(preview.counts.reminders,1); assert.equal(preview.warnings.length,0)
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
 const unknown=backupFixture(); unknown.unrecognized=[]; assert.throws(()=>parseBackup(legacy(unknown)))
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
