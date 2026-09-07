import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import {resolve,extname,sep} from 'node:path'
import {pathToFileURL} from 'node:url'
import {backupFixture} from './backup-fixtures.mjs'

const {chromium}=await import(pathToFileURL(process.env.SPM_PLAYWRIGHT_PATH).href)
const root=resolve('dist'),base='/service-project-manager/'
let revision=0
let failUpdate=false
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.webmanifest':'application/manifest+json'}
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)
  if(!pathname.startsWith(base)){res.writeHead(404);res.end();return}
  if(pathname===base+'sw.js'&&failUpdate){res.writeHead(503);res.end();return}
  let file=resolve(root,pathname.slice(base.length)||'index.html')
  if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return}
  let data
  try{data=await readFile(file)}catch{file=resolve(root,'index.html');data=await readFile(file)}
  if(pathname===base+'sw.js')data=Buffer.concat([data,Buffer.from('\n// release '+revision+'\n')])
  res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data)
 }catch{res.writeHead(500);res.end()}
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const url=`http://127.0.0.1:${server.address().port}${base}`
const browser=await chromium.launch({channel:'msedge'})
const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage()
try{
 await page.goto(url+'settings')
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{},{timeout:30000})
 await page.getByLabel('نام کسب‌وکار',{exact:true}).fill('اطلاعات محفوظ')
 await page.getByRole('button',{name:'ذخیره تنظیمات',exact:true}).click()
 await page.getByText('تنظیمات ذخیره شد.',{exact:true}).waitFor()
 await page.evaluate(customer=>new Promise((resolve,reject)=>{localStorage.setItem('update-test','keep');const request=indexedDB.open('ServiceProjectManagerDB');request.onsuccess=()=>{const db=request.result,tx=db.transaction('customers','readwrite');tx.objectStore('customers').put(customer);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)};request.onerror=()=>reject(request.error)}),backupFixture().customers[0])
 const check=page.getByRole('button',{name:'بررسی و دریافت به‌روزرسانی',exact:true})
 await check.click();await page.getByText('بررسی کامل شد؛ نسخه تازه‌تری روی سرور پیدا نشد.',{exact:true}).waitFor()
 revision++
 await page.getByLabel('نام کسب‌وکار',{exact:true}).fill('فرم ذخیره نشده')
 await check.click();await page.getByText('نسخه جدید دریافت شد. برای اجرا، دکمه زیر را بزنید.',{exact:true}).waitFor()
 assert.equal(await page.getByLabel('نام کسب‌وکار',{exact:true}).inputValue(),'فرم ذخیره نشده')
 const loaded=page.waitForEvent('load');await page.getByRole('button',{name:'اجرای نسخه جدید',exact:true}).click();await loaded
 await page.waitForFunction(()=>document.querySelector('input[aria-label="نام کسب‌وکار"]')?.value==='اطلاعات محفوظ')
 const kept=await page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('ServiceProjectManagerDB');request.onsuccess=()=>{const db=request.result,read=db.transaction('customers').objectStore('customers').get('c1');read.onsuccess=()=>{db.close();resolve({customer:read.result?.name,marker:localStorage.getItem('update-test')})};read.onerror=()=>reject(read.error)}}))
 assert.equal(kept.customer,backupFixture().customers[0].name);assert.equal(kept.marker,'keep')
 failUpdate=true;await check.click();await page.getByText('بررسی به‌روزرسانی انجام نشد؛ اتصال اینترنت را بررسی کنید.',{exact:true}).waitFor();failUpdate=false
 await context.setOffline(true);await check.click();await page.getByText('برای دریافت به‌روزرسانی به اینترنت وصل شوید.',{exact:true}).waitFor()
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 console.log('Real PWA update, latest-version check, explicit reload, offline feedback and IndexedDB/localStorage preservation passed.')
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
