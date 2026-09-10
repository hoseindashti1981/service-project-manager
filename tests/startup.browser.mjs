import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
const {chromium}=await import(pathToFileURL(process.env.SPM_PLAYWRIGHT_PATH).href)
const browser=await chromium.launch({channel:'msedge'})
try {
 const page=await browser.newPage({viewport:{width:390,height:844}})
 await page.goto('http://127.0.0.1:5173')
 assert.equal(await page.locator('.pwa-startup').count(),0)
 await page.evaluate(async()=>{const {db}=await import('/src/db/db.ts');const {defaultSettings}=await import('/src/domain/media.ts');await db.appSettings.put({...defaultSettings,name:'نام آزمایشی',color:'#aaff33'})})
 await page.addInitScript(()=>Object.defineProperty(navigator,'standalone',{value:true}))
 await page.reload({waitUntil:'domcontentloaded'})
 await page.getByRole('heading',{name:'نام آزمایشی',exact:true}).waitFor()
 assert.equal(await page.locator('.pwa-startup-track').getAttribute('role'),'progressbar')
 await page.locator('.pwa-startup').waitFor({state:'detached'})
 await page.getByRole('link',{name:'پروژه جدید',exact:true}).first().click()
 assert.equal(await page.locator('.pwa-startup').count(),0)
 console.log('Browser bypass, standalone branding, startup completion and navigation passed')
} finally {await browser.close()}
