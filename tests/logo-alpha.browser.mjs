import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
const {chromium}=await import(pathToFileURL(process.env.SPM_PLAYWRIGHT_PATH).href)
const browser=await chromium.launch({channel:'msedge'})
try {
 const page=await browser.newPage()
 await page.goto('http://127.0.0.1:5173/settings')
 const bytes=await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32
  const ctx=canvas.getContext('2d');ctx.fillStyle='#f00';ctx.fillRect(8,8,16,16)
  return Array.from(new Uint8Array(await (await fetch(canvas.toDataURL('image/png'))).arrayBuffer()))
 })
 await page.getByLabel('لوگو',{exact:true}).setInputFiles({name:'transparent.png',mimeType:'image/png',buffer:Buffer.from(bytes)})
 await page.locator('img[alt="logo"]').waitFor()
 await page.getByRole('button',{name:'ذخیره تنظیمات',exact:true}).click()
 await page.getByText('تنظیمات ذخیره شد.',{exact:true}).waitFor()
 const result=await page.evaluate(async()=>{
  const {db}=await import('/src/db/db.ts');const logo=(await db.appSettings.get('business')).logo
  const image=await createImageBitmap(await (await fetch(logo)).blob()),canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height
  const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);image.close()
  return {png:logo.startsWith('data:image/png;'),corner:ctx.getImageData(0,0,1,1).data[3],center:ctx.getImageData(16,16,1,1).data[3]}
 });assert.deepEqual(result,{png:true,corner:0,center:255})
 await page.reload();await page.locator('img[alt="logo"]').waitFor()
 console.log('Settings upload/save/reload preserves PNG alpha and opaque artwork.')
}finally{await browser.close()}
