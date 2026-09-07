import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
import {mkdirSync} from 'node:fs'
const {chromium}=await import(pathToFileURL(process.env.SPM_PLAYWRIGHT_PATH).href)
const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Asia/Tehran'})
const base='http://127.0.0.1:5173',errors=[];page.on('pageerror',e=>errors.push(e.message))
try{
 await page.clock.setFixedTime(new Date('2026-09-07T08:00:00+03:30'));await page.goto(base)
 const sums=await page.evaluate(async()=>{
  const {db}=await import('/src/db/db.ts'),{backupFixture}=await import('/tests/backup-fixtures.mjs'),{readDailyAccount}=await import('/src/db/repositories/daily-account-repository.ts');const d=backupFixture()
  d.projects[0].latitude=35.6892;d.projects[0].longitude=51.389;d.projects[0].agreementDate='2026-09-07';d.projects[0].contractAmount=1000;d.projects[0].discount=100
  d.projectChanges[0].date='2026-09-07';d.projectChanges[0].amount=200;d.payments[0].date='2026-09-07';d.payments[0].amount=300
  d.invoices.push({...d.invoices[0],id:'standalone',projectId:undefined,quotationId:undefined,date:'2026-09-07',total:50,number:'extra',lines:[{id:'x',description:'test',quantity:1,unitPrice:50,total:50}]})
  for(const [name,rows] of Object.entries(d))await db.table(name).bulkPut(rows)
  const canvas=document.createElement('canvas');canvas.width=20;canvas.height=20;const url=canvas.toDataURL('image/png')
  for(const id of ['photo1','photo2'])await db.photos.add({id,projectId:'p1',title:id,dataUrl:url,thumbnail:url,date:'2026-09-07',bytes:Math.ceil(url.split(',')[1].length*3/4),createdAt:Date.now(),updatedAt:Date.now()})
  await db.projectChanges.add({...d.projectChanges[0],id:'orphan',projectId:'missing',amount:9999})
  const sums=[await readDailyAccount('2026-09-07'),await readDailyAccount('2026-09-08')];await db.projectChanges.delete('orphan');return sums
 });assert.deepEqual(sums,[{receivable:1150,received:300,balance:850},{receivable:0,received:0,balance:0}])
 await page.getByText('1405/06/16',{exact:true}).waitFor();await page.getByRole('link',{name:/مانده دریافت امروز/}).getByText('۸۵۰ تومان',{exact:true}).waitFor()
 await page.goto(base+'/projects');assert.equal(await page.locator('a a').count(),0)
 await page.getByRole('button',{name:'🧭 مسیریابی پروژه',exact:true}).click()
 await page.evaluate(()=>{navigator.clipboard.writeText=async text=>{window.copied=text};navigator.share=async data=>{window.shared=data}})
 await page.getByRole('button',{name:'📋 کپی مختصات',exact:true}).click();assert.equal(await page.evaluate(()=>window.copied),'35.689200, 51.389000')
 await page.getByRole('button',{name:'🧭 مسیریابی و اشتراک',exact:true}).click();assert.match(await page.evaluate(()=>window.shared.url),/destination=35.689200/)
 await page.getByRole('button',{name:'بستن',exact:true}).click();await page.getByRole('link',{name:/گالری عکس‌ها/}).click();await page.waitForURL('**/projects/p1#photos')
 assert.equal(await page.locator('#photos').evaluate(e=>e.open),true)
 await page.getByRole('button',{name:'نمایش photo1',exact:true}).click();await page.getByRole('button',{name:'عکس بعدی',exact:true}).click();await page.waitForFunction(()=>document.querySelector('dialog[open] button:disabled')?.textContent==='عکس بعدی')
 await page.getByRole('button',{name:'بستن تصویر',exact:true}).click()
 await page.getByRole('button',{name:'راهنمای این صفحه',exact:true}).click();await page.getByRole('button',{name:'✏️ ویرایش راهنما',exact:true}).click();await page.getByLabel('متن راهنما',{exact:true}).fill('راهنمای اختصاصی آزمایش');await page.getByRole('button',{name:'ذخیره راهنما',exact:true}).click();await page.getByText('راهنمای اختصاصی آزمایش',{exact:true}).waitFor()
 const restored=await page.evaluate(async()=>{const {db}=await import('/src/db/db.ts'),{backupRepository:b}=await import('/src/db/repositories/backup-repository.ts');const backup=await b.export();await db.appSettings.clear();await b.import(backup);return (await db.appSettings.get('business')).helpOverrides['/projects/detail']});assert.equal(restored,'راهنمای اختصاصی آزمایش')
 await page.getByRole('button',{name:'بستن راهنما',exact:true}).click();await page.goto(base+'/settings');await page.getByRole('button',{name:'ذخیره تنظیمات',exact:true}).click();assert.equal(await page.evaluate(async()=>(await (await import('/src/db/db.ts')).db.appSettings.get('business')).helpOverrides['/projects/detail']),'راهنمای اختصاصی آزمایش')
 await page.goto(base+'/help');await page.getByText('آموزش کامل تکنسین',{exact:true}).click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'📥 دانلود فایل TXT',exact:true}).click();assert.equal((await download).suggestedFilename(),'lineyar-user-guide-fa.txt')
 mkdirSync('test-results/ui-refresh',{recursive:true});for(const route of ['/','/projects','/settings']){await page.goto(base+route);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'test-results/ui-refresh/'+(route.slice(1)||'home')+'.png',fullPage:true})}
 assert.deepEqual(errors,[]);console.log('UI refresh, daily accounting, directions, gallery and editable help passed')
}finally{await browser.close()}
