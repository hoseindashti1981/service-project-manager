import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
const {chromium}=await import(pathToFileURL(process.env.SPM_PLAYWRIGHT_PATH).href)
const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:390,height:844}})
try{
 await page.addInitScript(()=>{Object.defineProperty(navigator,'standalone',{value:true,configurable:true});navigator.geolocation.watchPosition=(success,error)=>{window.geoSuccess=success;window.geoError=error;window.watching=true;return 7};navigator.geolocation.clearWatch=()=>{window.watching=false};navigator.clipboard.writeText=async value=>{window.copied=value}})
 await page.goto('http://127.0.0.1:5173/projects/new')
 await page.getByRole('button',{name:'دریافت موقعیت زنده گوشی',exact:true}).click();await page.evaluate(()=>window.geoError({code:1}));await page.getByRole('alert').filter({hasText:'نسخه نصب‌شده'}).waitFor();assert.equal(await page.evaluate(()=>window.watching),false)
 await page.getByText('واردکردن مختصات از مرورگر یا نقشه',{exact:true}).click();await page.getByLabel('مختصات ورودی',{exact:true}).fill('۳۵٫۶۸۹۲۰۰، ۵۱٫۳۸۹۰۰۰');await page.getByRole('button',{name:'اعمال مختصات',exact:true}).click();assert.equal(await page.getByLabel('موقعیت قابل کپی',{exact:true}).inputValue(),'35.689200, 51.389000')
 await page.getByRole('button',{name:'کپی موقعیت انتخاب‌شده',exact:true}).click();assert.equal(await page.evaluate(()=>window.copied),'35.689200, 51.389000')
 await page.getByLabel('مختصات ورودی',{exact:true}).fill('91, 51');await page.getByRole('button',{name:'اعمال مختصات',exact:true}).click();await page.getByRole('alert').filter({hasText:'دو عدد'}).waitFor();assert.equal(await page.getByLabel('موقعیت قابل کپی',{exact:true}).inputValue(),'35.689200, 51.389000')
 for(const code of [2,3]){await page.getByRole('button',{name:'دریافت موقعیت زنده گوشی',exact:true}).click();await page.evaluate(code=>window.geoError({code}),code);await page.getByRole('alert').filter({hasText:code===2?'کد ۲':'کد ۳'}).waitFor();assert.equal(await page.getByLabel('موقعیت قابل کپی',{exact:true}).inputValue(),'35.689200, 51.389000')}
 await page.getByRole('button',{name:'دریافت موقعیت زنده گوشی',exact:true}).click();await page.getByLabel('مختصات ورودی',{exact:true}).fill('0, -180');await page.getByRole('button',{name:'اعمال مختصات',exact:true}).click();await page.evaluate(()=>window.geoSuccess({coords:{latitude:1,longitude:1,accuracy:1}}));assert.equal(await page.getByLabel('موقعیت قابل کپی',{exact:true}).inputValue(),'0.000000, -180.000000');assert.equal(await page.evaluate(()=>window.watching),false)
 assert.equal(await page.evaluate(async()=>await (await import('/src/db/db.ts')).db.projects.count()),0)
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 console.log('PWA denial, unavailable/timeout distinction, coordinate copy/paste, invalid input and stale GPS protection passed')
}finally{await browser.close()}
