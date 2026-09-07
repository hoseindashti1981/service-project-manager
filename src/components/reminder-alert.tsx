import {useEffect,useRef,useState} from 'react'
import {liveQuery} from 'dexie'
import {Link} from '@tanstack/react-router'
import {db} from '@/db/db'
import {useToday} from '@/domain/reminder/use-today'
import type {Reminder} from '@/domain/reminder/types'

export function ReminderAlert(){
 const today=useToday(),[items,setItems]=useState<Reminder[]>([]),[dismissed,setDismissed]=useState(''),[message,setMessage]=useState('')
 const [permission,setPermission]=useState(()=> 'Notification' in window?Notification.permission:'denied')
 const sent=useRef(''),sending=useRef(false)
 const due=items.filter(r=>r.dueDate<=today),current=due.filter(r=>r.dueDate===today).length
 const key=today+':'+due.map(r=>r.id+':'+r.dueDate).sort().join(',')
 useEffect(()=>{const subscription=liveQuery(()=>db.reminders.where('status').equals('open').toArray()).subscribe(setItems);return()=>subscription.unsubscribe()},[])
 useEffect(()=>{
   if(!due.length||!('Notification' in window)||permission!=='granted'||sent.current===key||sending.current)return
   let active=true
   async function notify(){
    if(document.visibilityState!=='visible'||sending.current)return
    try{if(localStorage.getItem('lineyar-reminder-notification')===key)return;sending.current=true;const registration=await navigator.serviceWorker?.getRegistration(import.meta.env.BASE_URL);if(!active||!registration)return;await registration.showNotification('لاین‌یار: یادآوری‌های امروز',{body:`${current.toLocaleString('fa-IR')} یادآوری امروز و ${(due.length-current).toLocaleString('fa-IR')} مورد عقب‌افتاده دارید. برنامه را بررسی کنید.`,tag:'lineyar-due-reminders'});sent.current=key;localStorage.setItem('lineyar-reminder-notification',key)}catch{}finally{sending.current=false}
   }
   void notify();document.addEventListener('visibilitychange',notify);return()=>{active=false;document.removeEventListener('visibilitychange',notify)}
 },[key,current,due.length,permission])
 if(!due.length||dismissed===key)return null
 return <section role="status" aria-label="هشدار یادآوری‌های امروز" className="mb-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-3 text-amber-950"><div className="flex items-start justify-between gap-3"><div><b>🔔 {current.toLocaleString('fa-IR')} یادآوری برای امروز</b>{due.length>current&&<p className="text-sm">{(due.length-current).toLocaleString('fa-IR')} یادآوری عقب‌افتاده هم دارید.</p>}</div><button type="button" aria-label="بستن هشدار یادآوری" className="min-h-11 min-w-11" onClick={()=>setDismissed(key)}>×</button></div><div className="flex flex-wrap gap-3"><Link to="/reminders" className="min-h-11 py-2 font-bold underline">مشاهده یادآوری‌ها</Link>{'Notification' in window&&permission==='default'&&<button className="min-h-11 text-sm underline" onClick={async()=>{try{const permission=await Notification.requestPermission();setPermission(permission);setMessage(permission==='granted'?'اعلان هنگام باز بودن برنامه فعال شد.':'هشدار داخل برنامه همچنان نمایش داده می‌شود.')}catch{setMessage('هشدار داخل برنامه فعال است؛ اعلان گوشی در این مرورگر در دسترس نیست.')}}}>فعال‌کردن اعلان گوشی</button>}</div><p className="text-xs">هشدار هنگام بازکردن یا بازگشت به برنامه بررسی می‌شود؛ در حالت بسته بودن کامل برنامه، اعلان زمان‌بندی‌شده ارسال نمی‌شود.</p>{message&&<p className="text-sm">{message}</p>}</section>
}
