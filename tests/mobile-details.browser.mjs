import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
const {chromium}=await import(pathToFileURL(process.env.SPM_PLAYWRIGHT_PATH).href)
const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Asia/Tehran'})
const base='http://127.0.0.1:5173',errors=[];page.on('pageerror',e=>errors.push(e.message))
try{
 await page.clock.setFixedTime(new Date('2026-09-08T08:09:10.123+03:30'));await page.goto(base)
 await page.evaluate(async()=>{const {db}=await import('/src/db/db.ts'),{backupFixture}=await import('/tests/backup-fixtures.mjs');const d=backupFixture();d.projects[0].address='آدرس بدون مختصات';for(const [name,rows] of Object.entries(d))await db.table(name).bulkPut(rows)})
 await page.goto(base+'/projects');await page.getByRole('button',{name:'🧭 مسیریابی پروژه',exact:true}).click();assert.equal(await page.getByRole('button',{name:'📋 کپی مختصات',exact:true}).isDisabled(),true);await page.getByText(/کپی غیرفعال است چون مختصات/).waitFor()
 await page.getByRole('button',{name:'🧭 انتخاب مسیریاب',exact:true}).click();assert.match(await page.getByRole('link',{name:'Apple Maps',exact:true}).getAttribute('href'),/daddr=/);assert.match(await page.getByRole('link',{name:'Google Maps',exact:true}).getAttribute('href'),/destination=/)
 await page.getByRole('link',{name:'ویرایش موقعیت پروژه',exact:true}).click();await page.getByText('راهنمای اجازه موقعیت در آیفون',{exact:true}).click();await page.getByText(/Settings → Privacy/).waitFor()
 await page.goto(base+'/settings');const promise=page.waitForEvent('download');await page.getByRole('button',{name:'دانلود بکاپ کامل',exact:true}).click();assert.equal((await promise).suggestedFilename(),'lineyar-backup-1405-06-17_08-09-10-123.json')
 const fonts=await page.evaluate(async()=>{const {loadDocumentFonts}=await import('/src/features/finance/document-fonts.ts');const frame=document.createElement('iframe');document.body.appendChild(frame);const d=frame.contentDocument;await loadDocumentFonts(d);const result={normal:d.fonts.check('400 16px Vazirmatn','آزمایش Invoice 123'),bold:d.fonts.check('700 16px Vazirmatn','آزمایش Invoice 123'),faces:Array.from(d.fonts).map(f=>({family:f.family,status:f.status}))};frame.remove();return result});assert.equal(fonts.normal,true);assert.equal(fonts.bold,true);assert.equal(fonts.faces.length,4);assert.ok(fonts.faces.every(f=>f.family==='Vazirmatn'&&f.status==='loaded'))
 await page.goto(base+'/finance');await page.getByRole('button',{name:'پیش‌نمایش',exact:true}).first().click();await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='دانلود PDF'&&!b.disabled));assert.match(await page.locator('.document-sheet').evaluate(e=>getComputedStyle(e).fontFamily),/^Vazirmatn/)
 await page.emulateMedia({media:'print'});assert.match(await page.locator('.document-sheet').evaluate(e=>getComputedStyle(e).fontFamily),/^Vazirmatn/);await page.emulateMedia({media:'screen'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 assert.deepEqual(errors,[]);console.log('Missing coordinates, map chooser, iPhone help, dated backup and real clone/print Vazirmatn fonts passed')
}finally{await browser.close()}
