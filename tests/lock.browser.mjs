import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
const {chromium}=await import(pathToFileURL(process.env.SPM_PLAYWRIGHT_PATH).href)
const browser=await chromium.launch({channel:'msedge'})
const context=await browser.newContext({viewport:{width:390,height:844}})
const page=await context.newPage()
const base='http://127.0.0.1:5173'
const password='my strong password 123'
const nextPassword='replacement password 456'
const errors=[];page.on('pageerror',error=>errors.push(error.message))
async function fillNew(value){
 await page.getByLabel('رمز جدید',{exact:true}).fill(value)
 await page.getByLabel('تکرار رمز جدید',{exact:true}).fill(value)
}
async function confirmCode(){
 const code=await page.getByTestId('recovery-code').textContent()
 await page.getByLabel('تأیید کد بازیابی',{exact:true}).fill(code)
 await page.getByRole('button',{name:'کد را نگه داشتم؛ ذخیره و قفل',exact:true}).click()
 await page.getByLabel('رمز ورود',{exact:true}).waitFor()
 return code
}
async function unlock(value){
 await page.getByLabel('رمز ورود',{exact:true}).fill(value)
 await page.getByRole('button',{name:'ورود',exact:true}).click()
 await page.getByRole('button',{name:'قفل کردن',exact:true}).waitFor()
}
try{
 await page.clock.install()
 await page.goto(base)
 await page.getByRole('button',{name:'تنظیمات قفل ورود (غیرفعال)',exact:true}).click()
 await fillNew(password)
 await page.getByRole('button',{name:'فعال‌سازی قفل',exact:true}).click()
 await page.getByTestId('recovery-code').waitFor()
 assert.equal(await page.evaluate(()=>localStorage.getItem('lineyar.local-lock.v1')),null)
 const recovery=await confirmCode()
 const raw=await page.evaluate(()=>localStorage.getItem('lineyar.local-lock.v1'))
 assert.ok(!raw.includes(password) && !raw.includes(recovery.replaceAll('-','')))
 await page.getByLabel('رمز ورود',{exact:true}).fill('wrong')
 await page.getByRole('button',{name:'ورود',exact:true}).click()
 await page.getByRole('alert').waitFor()
 assert.equal(await page.getByText('دفترچه تلفن مشتریان',{exact:true}).count(),0)
 await unlock(password)
 await page.reload()
 await page.getByLabel('رمز ورود',{exact:true}).waitFor()
 await unlock(password)
 await page.clock.fastForward(5*60*1000+1500)
 await page.getByLabel('رمز ورود',{exact:true}).waitFor()
 await unlock(password)
 const backup=await page.evaluate(async()=>await (await import('/src/db/repositories/backup-repository.ts')).backupRepository.export())
 assert.ok(!JSON.stringify(backup).includes('passwordHash'))
 const second=await context.newPage();await second.goto(base+'/customers')
 await second.getByLabel('رمز ورود',{exact:true}).fill(password)
 await second.getByRole('button',{name:'ورود',exact:true}).click()
 await second.getByRole('button',{name:'قفل کردن',exact:true}).waitFor()
 await page.getByRole('button',{name:'قفل کردن',exact:true}).click()
 await second.getByLabel('رمز ورود',{exact:true}).waitFor()
 await page.getByRole('button',{name:'رمز را فراموش کرده‌ام',exact:true}).click()
 await page.getByLabel('کد بازیابی',{exact:true}).fill(recovery)
 await fillNew(nextPassword)
 await page.getByRole('button',{name:'تغییر رمز و ساخت کد بازیابی جدید',exact:true}).click()
 const newRecovery=await confirmCode()
 assert.notEqual(newRecovery,recovery)
 await unlock(nextPassword)
 const throttled=await page.evaluate(async()=>{
  const {authenticate,readLock}=await import('/src/domain/security/lock.ts')
  for(let i=0;i<5;i++){try{await authenticate(readLock(),'incorrect')}catch{}}
  try{await authenticate(readLock(),'replacement password 456');return false}catch{return true}
 })
 assert.equal(throttled,true)
 await page.evaluate(()=>localStorage.removeItem('lineyar.lock-attempts.v1'))
 await page.getByRole('button',{name:'تنظیمات قفل ورود (فعال)',exact:true}).click()
 await page.getByLabel('رمز فعلی',{exact:true}).fill(nextPassword)
 await page.getByRole('button',{name:'غیرفعال‌کردن قفل با رمز فعلی',exact:true}).click()
 await page.getByRole('button',{name:'تنظیمات قفل ورود (غیرفعال)',exact:true}).waitFor()
 await page.reload()
 await page.getByRole('button',{name:'تنظیمات قفل ورود (غیرفعال)',exact:true}).waitFor()
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 assert.deepEqual(errors,[])
 console.log('Optional lock: setup confirmation, hashed secrets, wrong password, reload, cross-tab lock, recovery rotation and disable passed.')
}finally{await browser.close()}
