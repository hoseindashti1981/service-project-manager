import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { chromium } = await import(pathToFileURL(process.env.SPM_PLAYWRIGHT_PATH).href)
const browser = await chromium.launch({channel:'msedge'})
const page = await browser.newPage({viewport:{width:390,height:844}})
try {
 await page.goto('http://127.0.0.1:5173/reports')
 const result = await page.evaluate(async () => {
  const source=await (await fetch('/src/db/repositories/backup-repository.ts')).text(); const {db}=await import(source.match(/from "([^"]*\/db\/db\.ts[^"]*)"/)[1])
  const {backupRepository:r}=await import('/src/db/repositories/backup-repository.ts')
  const {backupFixture}=await import('/tests/backup-fixtures.mjs')
  const {createBackup}=await import('/src/domain/backup/validation.ts')
  const original=backupFixture()
  const check=(v,m)=>{if(!v)throw Error(m)}
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
  await db.transaction('rw',db.tables,async()=>{for(const [name,rows] of Object.entries(original))await db.table(name).bulkPut(rows)})
  const exported=await r.export()
  check(equal(exported.data,original),'export completeness')
  const changed=structuredClone(original); changed.customers[0].name='مشتری بازیابی'
  const incoming=await createBackup(changed)
  await r.import(incoming)
  check(equal((await r.getRecovery()).data,original),'safety copy')
  const before=await r.export(), safety=await r.getRecovery()
  const fail=()=>{throw Error('simulated write failure')}
  const tableMethod=db.table.bind(db); db.table=(name)=>{const table=tableMethod(name); if(name!=='projects')return table; const injected=Object.create(table); injected.bulkPut=fail; return injected}
  let rejected=false
  try {await r.import(exported)}catch{rejected=true}finally{db.table=tableMethod}
  check(rejected,'fault injection')
  check(equal((await r.export()).data,before.data),'rollback business data')
  check(equal((await r.getRecovery()).data,safety.data),'rollback safety copy')
  const corrupt=structuredClone(incoming);corrupt.data.customers[0].name='tampered'
  rejected=false;try{await r.import(corrupt)}catch{rejected=true}
  check(rejected && equal((await r.export()).data,before.data),'invalid backup protection')
  await r.import(await r.getRecovery())
  check(equal((await r.export()).data,original),'undo restore')
  return incoming
 })
 await page.reload()
 await page.getByLabel('فایل بکاپ',{exact:true}).setInputFiles({name:'test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(result))})
 await page.getByRole('heading',{name:'پیش‌نمایش بازیابی'}).waitFor()
 const restore=page.getByRole('button',{name:'بازیابی و جایگزینی داده‌ها'})
 assert.equal(await restore.isDisabled(),true)
 await page.getByLabel('تأیید جایگزینی کامل',{exact:true}).check()
 await restore.click()
 await page.getByText('بازیابی کامل شد.',{exact:false}).waitFor()
 assert.equal(await page.evaluate(async()=> (await (await import('/src/db/db')).db.customers.get('c1')).name),'مشتری بازیابی')
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 console.log('Backup browser checks passed: all tables, integrity, transaction rollback, recovery persistence, confirmation and restore UI.')
} finally {await browser.close()}
