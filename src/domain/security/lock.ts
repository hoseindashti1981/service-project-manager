export const LOCK_KEY = 'lineyar.local-lock.v1'
const ATTEMPTS_KEY = 'lineyar.lock-attempts.v1'
export interface LockConfig { version:1; salt:string; passwordHash:string; recoveryHash:string; minutes:number }
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')
export const recoveryText=(value:string)=>value.replace(/[\s-]/g,'').toLowerCase()
export function readLock(): LockConfig | null {
  const raw=localStorage.getItem(LOCK_KEY)
  if(!raw)return null
  const value=JSON.parse(raw)
  if(value.version!==1 || !/^[a-f0-9]{32}$/.test(value.salt) || !/^[a-f0-9]{64}$/.test(value.passwordHash) || !/^[a-f0-9]{64}$/.test(value.recoveryHash) || ![1,5,15].includes(value.minutes))throw Error('تنظیمات قفل خوانده نمی‌شود. داده‌های مرورگر را پاک نکنید.')
  return value
}
async function derive(secret:string,salt:string) {
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),'PBKDF2',false,['deriveBits'])
 return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:600000},key,256)))
}
export async function prepareLock(password:string,minutes:number) {
 if(password.length<10 || password.length>128)throw Error('رمز باید بین ۱۰ تا ۱۲۸ نویسه باشد.')
 if(![1,5,15].includes(minutes))throw Error('زمان قفل نامعتبر است.')
 const salt=hex(crypto.getRandomValues(new Uint8Array(16)))
 const recovery=hex(crypto.getRandomValues(new Uint8Array(16)))
 const config:LockConfig={version:1,salt,passwordHash:await derive(password,salt),recoveryHash:await derive(recovery,salt),minutes}
 return {config,recovery}
}
export async function authenticate(config:LockConfig,secret:string,recovery=false) {
 const attempt=JSON.parse(localStorage.getItem(ATTEMPTS_KEY)||'{"count":0,"until":0}')
 if(attempt.until>Date.now())throw Error('تلاش‌های ناموفق زیاد بوده؛ ۳۰ ثانیه صبر کنید و دوباره امتحان کنید.')
 const actual=await derive(recovery?recoveryText(secret):secret,config.salt)
 if(actual!==(recovery?config.recoveryHash:config.passwordHash)) {
  const count=Number(attempt.count||0)+1
  localStorage.setItem(ATTEMPTS_KEY,JSON.stringify({count,until:count>=5?Date.now()+30000:0}))
  throw Error(recovery?'کد بازیابی درست نیست.':'رمز درست نیست.')
 }
 localStorage.removeItem(ATTEMPTS_KEY)
}
export function saveLock(config:LockConfig|null,expected:string|null) {
 if(localStorage.getItem(LOCK_KEY)!==expected)throw Error('تنظیمات در پنجره دیگری تغییر کرده؛ دوباره وارد شوید.')
 if(config)localStorage.setItem(LOCK_KEY,JSON.stringify(config))
 else localStorage.removeItem(LOCK_KEY)
}
