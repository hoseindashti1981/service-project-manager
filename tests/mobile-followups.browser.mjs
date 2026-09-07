import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
const {chromium}=await import(pathToFileURL(process.env.SPM_PLAYWRIGHT_PATH).href)
const browser=await chromium.launch({channel:'msedge'})
const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Asia/Tehran'})
const base=process.env.SPM_TEST_URL||'http://127.0.0.1:5173'
await page.addInitScript(()=>{
 window.testNotices=[]
 class Notice {static permission='default';static async requestPermission(){Notice.permission='granted';return 'granted'}}
 Object.defineProperty(window,'Notification',{value:Notice,configurable:true})
 navigator.serviceWorker.getRegistration=async()=>({showNotification:async(title,options)=>window.testNotices.push({title,options})})
 navigator.geolocation.watchPosition=(success,error)=>{window.locationSuccess=success;window.locationError=error;window.watchActive=true;return 1}
 navigator.geolocation.clearWatch=()=>{window.watchActive=false}
})
await page.route('https://tile.openstreetmap.org/**',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6fZsAAAAASUVORK5CYII=','base64')}))
const errors=[];page.on('pageerror',error=>errors.push(error.message))
try{
 await page.clock.setFixedTime(new Date('2026-09-07T08:00:00+03:30'))
 await page.goto(base)
 await page.evaluate(async()=>{const {db}=await import('/src/db/db.ts'),{backupFixture}=await import('/tests/backup-fixtures.mjs');const data=backupFixture();await db.customers.bulkPut(data.customers);await db.projects.bulkPut(data.projects);await db.reminders.add({...data.reminders[0],dueDate:'2026-09-08',status:'open',title:'پیگیری فردا'})})
 assert.equal(await page.getByRole('status',{name:'هشدار یادآوری‌های امروز'}).count(),0)
 await page.clock.setFixedTime(new Date('2026-09-08T08:00:00+03:30'));await page.evaluate(()=>window.dispatchEvent(new Event('focus')))
 await page.getByRole('status',{name:'هشدار یادآوری‌های امروز'}).waitFor()
 await page.getByRole('button',{name:'فعال‌کردن اعلان گوشی'}).click();await page.waitForFunction(()=>window.testNotices.length===1)
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));assert.equal(await page.evaluate(()=>window.testNotices.length),1)
 await page.evaluate(async()=>{const {db}=await import('/src/db/db.ts');await db.reminders.toCollection().modify({status:'done'})});await page.getByRole('status',{name:'هشدار یادآوری‌های امروز'}).waitFor({state:'hidden'})
 await page.goto(base+'/customers/c1');await page.locator('form input[type=text]').first().fill('نباید ذخیره شود');await page.getByRole('button',{name:'انصراف',exact:true}).click();await page.waitForURL('**/customers')
 assert.notEqual(await page.evaluate(async()=>(await (await import('/src/db/db.ts')).db.customers.get('c1')).name),'نباید ذخیره شود')
 await page.goto(base+'/projects/new');await page.getByPlaceholder('مثال: پروژه مهرویلا').fill('پروژه دارای موقعیت');await page.getByLabel('آدرس پروژه',{exact:true}).fill('آدرس دستی')
 await page.getByRole('button',{name:'دریافت موقعیت زنده گوشی'}).click()
 await page.evaluate(()=>window.locationSuccess({coords:{latitude:35.7,longitude:51.4,accuracy:5}}));await page.getByText('35.700000, 51.400000',{exact:true}).waitFor()
 await page.evaluate(()=>window.locationSuccess({coords:{latitude:35.71,longitude:51.41,accuracy:4}}));await page.getByText('35.710000, 51.410000',{exact:true}).waitFor()
 await page.getByRole('button',{name:'توقف موقعیت زنده'}).click();assert.equal(await page.evaluate(()=>window.watchActive),false)
 await page.getByRole('button',{name:'انتخاب از نقشه'}).click();const map=page.getByLabel('نقشه انتخاب محل پروژه',{exact:true});await map.click({position:{x:220,y:130}})
 assert.equal(await page.getByLabel('آدرس پروژه',{exact:true}).inputValue(),'آدرس دستی')
 await page.getByRole('button',{name:'ذخیره پروژه',exact:true}).click();await page.waitForURL('**/projects')
 const project=await page.evaluate(async()=>(await (await import('/src/db/db.ts')).db.projects.toArray()).find(p=>p.title==='پروژه دارای موقعیت'))
 assert.ok(Number.isFinite(project.latitude)&&Number.isFinite(project.longitude));assert.notEqual(project.latitude,35.71)
 await page.goto(base+'/projects/'+project.id);await page.getByRole('button',{name:'انتخاب از نقشه'}).click();await page.getByLabel('نقشه انتخاب محل پروژه',{exact:true}).click({position:{x:190,y:110}});await page.getByRole('button',{name:'ذخیره تغییرات',exact:true}).click();await page.getByText('تغییرات با موفقیت ذخیره شد',{exact:true}).waitFor()
 const changed=await page.evaluate(async(id)=>(await (await import('/src/db/db.ts')).db.projects.get(id)).latitude,project.id);assert.notEqual(changed,project.latitude)
 await page.getByText('عکس‌های پروژه (۰)',{exact:true}).click()
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=20;c.height=20;return c.toDataURL('image/png').split(',')[1]})
 await page.getByLabel('افزودن عکس',{exact:true}).setInputFiles([{name:'one.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')},{name:'broken.png',mimeType:'image/png',buffer:Buffer.from('bad')},{name:'two.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')}])
 await page.getByText('۲ عکس ذخیره شد؛ ۱ عکس ناموفق بود.',{exact:true}).waitFor();assert.equal(await page.evaluate(async(id)=>(await (await import('/src/db/db.ts')).db.photos.where('projectId').equals(id).count()),project.id),2)
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 await page.getByRole('button',{name:'دریافت موقعیت زنده گوشی'}).click();await page.evaluate(()=>window.locationError({code:1}));await page.getByRole('alert').filter({hasText:'دسترسی موقعیت این صفحه رد شد (کد ۱)'}).waitFor()
 assert.deepEqual(errors,[])
 console.log('Tomorrow reminder rollover, notification permission/deduplication, completion, customer cancel, live GPS, map create/edit and partial multi-photo upload passed.')
}finally{await browser.close()}
