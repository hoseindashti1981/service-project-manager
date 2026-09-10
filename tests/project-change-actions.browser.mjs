import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
const {chromium}=await import(pathToFileURL(process.env.SPM_PLAYWRIGHT_PATH).href)
const browser=await chromium.launch({channel:'msedge'})
try {
 const page=await browser.newPage({viewport:{width:390,height:844}})
 await page.goto('http://127.0.0.1:5173')
 await page.evaluate(async()=>{const {db}=await import('/src/db/db.ts'),{backupFixture}=await import('/tests/backup-fixtures.mjs');for(const [name,rows] of Object.entries(backupFixture()))await db.table(name).bulkPut(rows)})
 await page.goto('http://127.0.0.1:5173/projects/p1')
 await page.getByRole('button',{name:'ویرایش کار اضافه',exact:true}).first().click()
 await page.getByLabel('مبلغ کار اضافه',{exact:true}).fill('۳۰۰')
 await page.getByRole('button',{name:'ذخیره ویرایش کار اضافه',exact:true}).click()
 await page.getByRole('dialog').waitFor({state:'hidden'})
 assert.equal(await page.evaluate(async()=>(await (await import('/src/db/db.ts')).db.projectChanges.toArray())[0].amount),300)
 await page.getByRole('button',{name:'ویرایش کار اضافه',exact:true}).first().click()
 await page.getByLabel('مبلغ کار اضافه',{exact:true}).fill('999')
 await page.getByRole('button',{name:'انصراف',exact:true}).click()
 assert.equal(await page.evaluate(async()=>(await (await import('/src/db/db.ts')).db.projectChanges.toArray())[0].amount),300)
 page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'حذف کار اضافه',exact:true}).first().click()
 assert.equal(await page.evaluate(async()=>await (await import('/src/db/db.ts')).db.projectChanges.count()),1)
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'حذف کار اضافه',exact:true}).first().click()
 await page.waitForFunction(async()=>await (await import('/src/db/db.ts')).db.projectChanges.count()===0)
 console.log('Extra work edit, cancel, delete confirmation and removal passed')
}finally{await browser.close()}
