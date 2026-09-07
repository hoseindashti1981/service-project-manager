import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
const {chromium}=await import(pathToFileURL(process.env.SPM_PLAYWRIGHT_PATH).href)
const browser=await chromium.launch({channel:'msedge'})
const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage()
const base=process.env.SPM_PREVIEW_URL||'http://127.0.0.1:4174/service-project-manager/'
try{
 await page.goto(base)
 await page.evaluate(async()=>{await navigator.serviceWorker.ready})
 await page.reload()
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller)
 await page.evaluate(async()=>{await document.fonts.load('16px Vazirmatn','پروژه');await document.fonts.ready})
 const cached=await page.evaluate(async()=>{const keys=await caches.keys();return (await Promise.all(keys.map(async k=>(await (await caches.open(k)).keys()).map(r=>r.url)))).flat()})
 assert.ok(cached.some(u=>u.includes('vazirmatn-arabic-400')&&u.endsWith('.woff2')))
 await context.setOffline(true)
 await page.reload()
 await page.getByRole('button',{name:'راهنمای این صفحه'}).waitFor()
 const fonts=await page.evaluate(async()=>{const loaded=await document.fonts.load('16px Vazirmatn','پروژه');return {count:loaded.length,ready:document.fonts.check('16px Vazirmatn','پروژه')}})
 assert.ok(fonts.count>0&&fonts.ready)
 await page.goto(base+'settings');await page.getByLabel('نام کسب‌وکار',{exact:true}).waitFor()
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 console.log('Production base path, Service Worker navigation and cached Persian font passed offline.')
}finally{await browser.close()}
