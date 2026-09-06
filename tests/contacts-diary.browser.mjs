import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const {chromium}=await import(pathToFileURL(process.env.SPM_PLAYWRIGHT_PATH).href)
const browser=await chromium.launch({channel:'msedge'})
const page=await browser.newPage({viewport:{width:390,height:844}})
const base='http://127.0.0.1:5173'
try {
 await page.goto(base)
 await page.evaluate(async()=>{
  const {db}=await import('/src/db/db.ts')
  const {backupFixture}=await import('/tests/backup-fixtures.mjs')
  const rows=backupFixture()
  rows.customers[0].mobile='۰۹۱۲ ۳۴۵ ۶۷۸۹'
  rows.services.push({...rows.services[0],id:'s2',name:'گزارش کابل‌کشی'})
  for(const [table,data] of Object.entries(rows))await db.table(table).bulkPut(data)
 })
 await page.goto(base+'/customers')
 await page.getByLabel('جستجوی مشتری').fill('0912345')
 await page.getByRole('link',{name:'تماس با مشتری پشتیبان',exact:true}).waitFor()
 assert.equal(await page.getByRole('link',{name:'تماس با مشتری پشتیبان',exact:true}).getAttribute('href'),'tel:09123456789')
 await page.getByLabel('جستجوی مشتری').fill('ناشناخته')
 await page.getByText('مشتری مطابق جستجو پیدا نشد.').waitFor()
 await page.goto(base+'/activities/today')
 await page.getByLabel('خدمت پروژه',{exact:true}).selectOption('catalog:s2')
 await page.getByLabel('عنوان فعالیت',{exact:true}).fill('گزارش بدون حساب مالی')
 await page.getByRole('button',{name:'ثبت فعالیت',exact:true}).click()
 await page.getByText('فعالیت با موفقیت ذخیره شد.').waitFor()
 const result=await page.evaluate(async()=>{
  const {db}=await import('/src/db/db.ts')
  return {activity:await db.projectActivities.filter(a=>a.title==='گزارش بدون حساب مالی').first(),items:await db.projectItems.count(),project:await db.projects.get('p1')}
 })
 assert.equal(result.activity.amount,undefined)
 assert.equal(result.activity.quantity,undefined)
 assert.equal(result.items,1)
 assert.equal(result.project.contractAmount,100)
 await page.getByLabel('عنوان فعالیت',{exact:true}).fill('یادداشت مبلغ اختیاری')
 await page.getByLabel('مبلغ فعالیت به تومان (اختیاری)',{exact:true}).fill('۲۵۰')
 await page.getByRole('button',{name:'ثبت فعالیت',exact:true}).click()
 await page.getByText('مبلغ یادداشت‌شده:',{exact:false}).waitFor()
 await page.reload()
 const backup=await page.evaluate(async()=>await (await import('/src/db/repositories/backup-repository.ts')).backupRepository.export())
 assert.equal(backup.data.projectActivities.find(a=>a.title==='یادداشت مبلغ اختیاری').amount,250)
 assert.equal(backup.data.projects[0].contractAmount,100)
 assert.equal(backup.data.payments.length,1)
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 console.log('Phonebook search/tel links and diary without amounts or automatic financial rows pass; optional amounts persist in backups.')
}finally{await browser.close()}
