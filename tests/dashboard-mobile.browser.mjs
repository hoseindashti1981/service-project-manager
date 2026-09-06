import assert from 'node:assert/strict'
import {mkdirSync,readFileSync} from 'node:fs'
import {pathToFileURL} from 'node:url'
const {chromium}=await import(pathToFileURL(process.env.SPM_PLAYWRIGHT_PATH).href)
const browser=await chromium.launch({channel:'msedge'})
const page=await browser.newPage()
mkdirSync('test-results/dashboard',{recursive:true})
try{
 await page.goto('http://127.0.0.1:5173/')
 await page.evaluate(async()=>{
  const {db}=await import('/src/db/db.ts')
  const {backupFixture}=await import('/tests/backup-fixtures.mjs')
  const data=backupFixture()
  for(const [name,rows] of Object.entries(data))await db.table(name).bulkPut(rows)
 })
 await page.getByRole('link',{name:/پروژه پشتیبان/}).first().waitFor()
 await page.evaluate(()=>document.fonts.ready)
 for(const width of [768,1280]){
  await page.setViewportSize({width,height:900})
  const png=await page.screenshot()
  const file='test-results/dashboard/baseline-'+width+'.png'
  if(process.argv.includes('--baseline'))await page.screenshot({path:file})
  else if(process.argv.includes('--compare')) assert.ok(png.equals(readFileSync(file)),'Desktop/tablet screenshot changed at '+width)
 }
 if(!process.argv.includes('--baseline')){
  for(const width of [360,375,390,414,430]){
   await page.setViewportSize({width,height:844})
   const metrics=await page.evaluate(()=>{
    const box=s=>document.querySelector(s).getBoundingClientRect()
    return {overflow:document.documentElement.scrollWidth>innerWidth,hero:box('[data-dashboard-hero]').height,kpi:box('[aria-label="وضعیت پروژه‌ها"] a').height,summary:box('[aria-label="خلاصه امروز و مالی"]').bottom,list:box('[data-dashboard-projects]').top}
   })
   assert.equal(metrics.overflow,false)
   assert.ok(metrics.hero<=180 && metrics.kpi<=85 && metrics.list<740,JSON.stringify(metrics))
   await page.screenshot({path:'test-results/dashboard/mobile-'+width+'.png'})
  }
  await page.evaluate(async()=>{
   const {db}=await import('/src/db/db.ts')
   await db.projects.update('p1',{title:'پروژه بازسازی روشنایی ساختمان با نام بسیار طولانی برای بررسی نمایش کامل اطلاعات',plannedEndDate:'2030-01-01'})
   await db.customers.update('c1',{name:'مشتری با نام و نام خانوادگی طولانی برای بررسی چیدمان فارسی'})
  })
  await page.getByRole('link',{name:/پروژه بازسازی روشنایی/}).first().waitFor()
  for(const width of [360,375,390,414,430]){
   await page.setViewportSize({width,height:844})
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  }
  await page.getByRole('button',{name:'بیشتر',exact:true}).click()
  await page.getByRole('link',{name:'خدمات',exact:true}).last().waitFor()
  console.log('Five mobile widths: compact hero/KPIs, visible summary/project list, no overflow. Desktop/tablet checked (pixel comparison with --compare); More menu works.')
 }
}finally{await browser.close()}
