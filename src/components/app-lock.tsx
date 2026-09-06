import { useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react'
import { authenticate, LOCK_KEY, prepareLock, readLock, recoveryText, saveLock, type LockConfig } from '@/domain/security/lock'

export function AppLock({children}:{children:ReactNode}) {
 const [initial]=useState(()=>{try{return {config:readLock(),error:''}}catch(error){return {config:null,error:String(error)}}})
 const [config,setConfig]=useState<LockConfig|null>(initial.config)
 const [locked,setLocked]=useState(!!initial.config)
 const [settings,setSettings]=useState(false)
 const [recoveryMode,setRecoveryMode]=useState(false)
 const [secret,setSecret]=useState('')
 const [password,setPassword]=useState('')
 const [repeat,setRepeat]=useState('')
 const [minutes,setMinutes]=useState(initial.config?.minutes||5)
 const [pending,setPending]=useState<Awaited<ReturnType<typeof prepareLock>>|null>(null)
 const [confirmation,setConfirmation]=useState('')
 const [error,setError]=useState(initial.error)
 const [busy,setBusy]=useState(false)
 const busyRef=useRef(false)
 const generation=useRef(0)
 const expected=useRef<string|null>(null)
 const clear=()=>{setSecret('');setPassword('');setRepeat('');setConfirmation('');setPending(null);setError('')}
 const lock=()=>{generation.current++;setLocked(true);setSettings(false);setRecoveryMode(false);clear();try{localStorage.setItem('lineyar.lock-event',crypto.randomUUID())}catch{/* This window must still lock if storage is full. */}}
 useEffect(()=>{
  const changed=(event:StorageEvent)=>{
   if(event.key==='lineyar.lock-event'){if(config){generation.current++;setLocked(true);setSettings(false);setRecoveryMode(false);clear()}return}
   if(event.key!==LOCK_KEY && event.key!==null)return
   generation.current++
   try{const next=readLock();setConfig(next);setLocked(!!next);setSettings(false);clear()}
   catch(error){setError(String(error));setLocked(true)}
  }
  window.addEventListener('storage',changed)
  return ()=>window.removeEventListener('storage',changed)
 },[config])
 useEffect(()=>{
  if(!config || locked)return
  let last=Date.now()
  const activity=()=>{if(Date.now()-last>=config.minutes*60000)lock();else last=Date.now()}
  const hidden=()=>{if(document.hidden)lock()}
  const timer=window.setInterval(()=>{if(Date.now()-last>=config.minutes*60000)lock()},1000)
  const events=['pointerdown','keydown','touchstart','scroll'] as const
  events.forEach(event=>window.addEventListener(event,activity,{passive:true}))
  document.addEventListener('visibilitychange',hidden)
  return ()=>{clearInterval(timer);events.forEach(event=>window.removeEventListener(event,activity));document.removeEventListener('visibilitychange',hidden)}
 },[config,locked])
 async function run(action:()=>Promise<void>){
  if(busyRef.current)return
  busyRef.current=true;setBusy(true);setError('')
  try{await action()}catch(error){setError(error instanceof Error?error.message:'عملیات انجام نشد.')}
  finally{busyRef.current=false;setBusy(false)}
 }
 async function verifyCurrent(){
  const snapshot=localStorage.getItem(LOCK_KEY)
  const current=readLock()
  if(JSON.stringify(current)!==JSON.stringify(config))throw Error('تنظیمات تغییر کرده؛ صفحه را دوباره باز کنید.')
  const epoch=generation.current
  if(current)await authenticate(current,secret,recoveryMode)
  if(epoch!==generation.current || snapshot!==localStorage.getItem(LOCK_KEY))throw Error('ورود دوباره لازم است.')
  return snapshot
 }
 async function unlock(event:FormEvent){
  event.preventDefault()
  await run(async()=>{await verifyCurrent();if(document.hidden)throw Error('برای ورود، برنامه را در پیش‌زمینه باز کنید.');setLocked(false);clear()})
 }
 async function prepare(event:FormEvent){
  event.preventDefault()
  await run(async()=>{
   if(password!==repeat)throw Error('تکرار رمز یکسان نیست.')
   const epoch=generation.current
   const snapshot=await verifyCurrent()
   const next=await prepareLock(password,minutes)
   if(epoch!==generation.current)throw Error('ورود دوباره لازم است.')
   expected.current=snapshot;setPending(next);setPassword('');setRepeat('');setSecret('')
  })
 }
 async function commit(){
  await run(async()=>{
   if(!pending || recoveryText(confirmation)!==pending.recovery)throw Error('کد بازیابی نمایش‌داده‌شده را برای تأیید وارد کنید.')
   saveLock(pending.config,expected.current);setConfig(pending.config);setLocked(true);setSettings(false);setRecoveryMode(false);clear()
  })
 }
 async function disable(){
  await run(async()=>{const snapshot=await verifyCurrent();saveLock(null,snapshot);setConfig(null);setLocked(false);setSettings(false);clear()})
 }
 const input='w-full rounded-xl border p-3'
 const button='min-h-11 rounded-xl bg-indigo-700 px-4 py-2 text-white disabled:opacity-50'
 const editing=settings || (locked && recoveryMode)
 if(initial.error)return <main className="p-6" role="alert">{initial.error}</main>
 if(locked || settings)return <main dir="rtl" className="mx-auto min-h-screen max-w-lg space-y-5 bg-slate-50 p-5">
  <h1 className="text-xl font-bold">{pending?'کد بازیابی را نگه دارید':editing?'تنظیمات قفل برنامه':'ورود به برنامه'}</h1>
  <p className="text-sm text-slate-600">قفل محلی این مرورگر؛ اطلاعات دستگاه رمزگذاری نمی‌شوند. تنظیمات قفل در بکاپ اطلاعات قرار نمی‌گیرند.</p>
  {pending?<section className="space-y-4">
   <p>این کد جای رمز فراموش‌شده را می‌گیرد. در جای امن خارج از برنامه نگه دارید. با تأیید، کد قبلی باطل می‌شود.</p>
   <code dir="ltr" className="block break-all rounded-xl bg-white p-4 text-lg" data-testid="recovery-code">{pending.recovery.match(/.{1,4}/g)?.join('-')}</code>
   <label className="block">تأیید کد بازیابی<input aria-label="تأیید کد بازیابی" autoComplete="off" value={confirmation} onChange={e=>setConfirmation(e.target.value)} className={input}/></label>
   <button disabled={busy} onClick={()=>void commit()} className={button}>کد را نگه داشتم؛ ذخیره و قفل</button>
   <button disabled={busy} onClick={()=>{setPending(null);setConfirmation('')}} className="block min-h-11">بازگشت</button>
  </section>:editing?<form onSubmit={event=>void prepare(event)} className="space-y-4">
   {config && <label className="block">{recoveryMode?'کد بازیابی':'رمز فعلی'}<input aria-label={recoveryMode?'کد بازیابی':'رمز فعلی'} type="password" autoComplete={recoveryMode?'off':'current-password'} required value={secret} onChange={e=>setSecret(e.target.value)} className={input}/></label>}
   <label className="block">رمز جدید<input aria-label="رمز جدید" type="password" autoComplete="new-password" minLength={10} maxLength={128} required value={password} onChange={e=>setPassword(e.target.value)} className={input}/></label>
   <p className="text-xs">حداقل ۱۰ نویسه؛ از یک عبارت طولانی و به‌یادماندنی استفاده کنید.</p>
   <label className="block">تکرار رمز جدید<input aria-label="تکرار رمز جدید" type="password" autoComplete="new-password" required value={repeat} onChange={e=>setRepeat(e.target.value)} className={input}/></label>
   <label className="block">قفل پس از بی‌کاری<select aria-label="قفل پس از بی‌کاری" value={minutes} onChange={e=>setMinutes(Number(e.target.value))} className={input}><option value={1}>۱ دقیقه</option><option value={5}>۵ دقیقه</option><option value={15}>۱۵ دقیقه</option></select></label>
   <p className="text-xs">با خروج از صفحه یا رفتن برنامه به پس‌زمینه هم قفل می‌شود. فرم ذخیره‌نشده بسته خواهد شد.</p>
   <button disabled={busy} className={button}>{config?'تغییر رمز و ساخت کد بازیابی جدید':'فعال‌سازی قفل'}</button>
   {config && !recoveryMode && <button type="button" disabled={busy} onClick={()=>void disable()} className="block min-h-11 text-rose-700">غیرفعال‌کردن قفل با رمز فعلی</button>}
  </form>:<form onSubmit={event=>void unlock(event)} className="space-y-4">
   <label className="block">رمز ورود<input aria-label="رمز ورود" type="password" autoComplete="current-password" required value={secret} onChange={e=>setSecret(e.target.value)} className={input}/></label>
   <button disabled={busy} className={button}>ورود</button>
   <button disabled={busy} type="button" onClick={()=>{clear();setRecoveryMode(true)}} className="block min-h-11 text-indigo-700">رمز را فراموش کرده‌ام</button>
  </form>}
  {editing && !pending && <button disabled={busy} onClick={()=>{clear();setSettings(false);setRecoveryMode(false)}} className="min-h-11">انصراف</button>}
  {recoveryMode && <p className="text-sm">اگر رمز و کد بازیابی را هر دو گم کرده‌اید، راه بازیابی رمز در این نسخه وجود ندارد. داده‌های مرورگر را پاک نکنید؛ بکاپ خارجی خود را نگه دارید.</p>}
  {busy && <p role="status">در حال بررسی…</p>}
  {error && <p role="alert" className="text-rose-700">{error}</p>}
 </main>
 return <><div dir="rtl" className="flex flex-wrap justify-end gap-3 border-b bg-white px-4 py-2 lg:mr-64"><button className="min-h-11 text-sm text-indigo-700" onClick={()=>{clear();setSettings(true);setMinutes(config?.minutes||5)}}>تنظیمات قفل ورود {config?'(فعال)':'(غیرفعال)'}</button>{config && <button className="min-h-11 text-sm" onClick={lock}>قفل کردن</button>}</div>{children}</>
}
