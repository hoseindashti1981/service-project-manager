import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
const {chromium}=await import(pathToFileURL(process.env.SPM_PLAYWRIGHT_PATH).href)
const browser=await chromium.launch({channel:'msedge'})
const base=process.env.SPM_BASE_URL||'http://127.0.0.1:5173'
try {
 const context=await browser.newContext({viewport:{width:390,height:844},geolocation:{latitude:35.6892,longitude:51.389},permissions:['geolocation','clipboard-read','clipboard-write']})
 const page=await context.newPage()
 await page.goto(base+'/projects/new')
 if(process.env.SPM_BASE_URL){await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration())?.active);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller)}
 await page.getByPlaceholder('مثال: پروژه مهرویلا').fill('پروژه حفظ‌شده')
 await page.getByPlaceholder('آدرس محل پروژه').fill('آدرس حفظ‌شده')
 const live=await page.getByRole('button',{name:'دریافت موقعیت زنده گوشی',exact:true}).boundingBox(),launch=page.getByRole('button',{name:'دریافت مختصات در Safari / مرورگر',exact:true}),map=await page.getByRole('button',{name:'انتخاب از نقشه',exact:true}).boundingBox()
 const launchBox=await launch.boundingBox();assert.ok(live.y<launchBox.y&&launchBox.y<map.y)
 const popupEvent=page.waitForEvent('popup');await launch.click();const popup=await popupEvent
 await popup.getByRole('button',{name:'دریافت موقعیت فعلی',exact:true}).click()
 await popup.waitForFunction(()=>document.querySelector('#coordinates').value.length>0)
 assert.equal(await popup.getByLabel('عرض و طول جغرافیایی').inputValue(),'35.689200, 51.389000')
 await popup.evaluate(()=>window.opener.postMessage({type:'lineyar-location',token:'wrong',coordinates:'1, 2'},location.origin))
 assert.equal(await page.getByLabel('موقعیت قابل کپی').count(),0)
 await popup.getByRole('button',{name:'قرار دادن در پروژه و بازگشت',exact:true}).click()
 await page.getByLabel('موقعیت قابل کپی').waitFor()
 assert.equal(await page.getByLabel('موقعیت قابل کپی').inputValue(),'35.689200, 51.389000')
 assert.equal(await page.getByPlaceholder('مثال: پروژه مهرویلا').inputValue(),'پروژه حفظ‌شده')
 assert.equal(await page.getByPlaceholder('آدرس محل پروژه').inputValue(),'آدرس حفظ‌شده')
 await page.evaluate(()=>navigator.clipboard.writeText('۳۶٫۱, ۵۲٫۲'))
 await page.getByRole('button',{name:'قرار دادن مختصات کپی‌شده در پروژه',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('[aria-label="موقعیت قابل کپی"]').value==='36.100000, 52.200000')
 await page.evaluate(()=>navigator.clipboard.writeText('999, 12'))
 await page.getByRole('button',{name:'قرار دادن مختصات کپی‌شده در پروژه',exact:true}).click()
 assert.equal(await page.getByLabel('موقعیت قابل کپی').inputValue(),'36.100000, 52.200000')
 const isolated=await context.newPage();await isolated.goto(base+'/browser-location.html')
 await isolated.getByRole('button',{name:'دریافت موقعیت فعلی',exact:true}).click();await isolated.waitForFunction(()=>!document.querySelector('#apply').disabled)
 await isolated.getByRole('button',{name:'قرار دادن در پروژه و بازگشت',exact:true}).click()
 await isolated.getByText('انتقال مستقیم در این محیط ممکن نیست؛ کپی مختصات را بزنید و به لاین‌یار برگردید.',{exact:true}).waitFor()
 console.log('Button order, browser geolocation, validated direct transfer, draft preservation and isolated clipboard fallback passed.')
}finally{await browser.close()}
