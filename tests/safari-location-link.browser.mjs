import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
const {chromium}=await import(pathToFileURL(process.env.SPM_PLAYWRIGHT_PATH).href)
const browser=await chromium.launch({channel:'msedge'})
try {
 const context=await browser.newContext({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1'})
 await context.route('https://lineyar.test/**',async route=>{const response=await route.fetch({url:route.request().url().replace('https://lineyar.test','http://127.0.0.1:5173')});await route.fulfill({response})})
 const page=await context.newPage();await page.goto('https://lineyar.test/projects/new')
 const link=page.getByRole('button',{name:'دریافت مختصات در Safari / مرورگر',exact:true})
 assert.equal(await link.getAttribute('href'),'x-safari-https://lineyar.test/browser-location.html')
 await link.evaluate(element=>element.addEventListener('click',event=>event.preventDefault()))
 await page.getByPlaceholder('مثال: پروژه مهرویلا').fill('فرم محفوظ')
 await link.click()
 await page.getByRole('button',{name:'قرار دادن مختصات کپی‌شده در پروژه',exact:true}).waitFor()
 assert.equal(await page.getByPlaceholder('مثال: پروژه مهرویلا').inputValue(),'فرم محفوظ')
 assert.equal(await page.getByLabel('آدرس صفحه مختصات در Safari').inputValue(),'https://lineyar.test/browser-location.html')
 assert.equal(context.pages().length,1)
 console.log('iPhone HTTPS Safari scheme, preserved form and clipboard fallback passed; OS app launch requires an iPhone.')
}finally{await browser.close()}
