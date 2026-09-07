import { useEffect,useRef,useState } from 'react'
import { Link,useRouterState } from '@tanstack/react-router'
import guide from '../../docs/user-guide-fa.txt?raw'
const helpTopics:Record<string,{title:string;text:string}>={
 '/':{title:'داشبورد',text:'کارت وضعیت را لمس کنید تا پروژه‌های همان وضعیت باز شوند. خلاصه حساب از قرارداد، کار اضافه، تخفیف و پرداخت‌ها محاسبه می‌شود.'},
 '/projects':{title:'پروژه‌ها',text:'مشتری و مبلغ قرارداد را مشخص کنید. در صفحه پروژه ابتدا گردش کار و سپس تاریخچه دیده می‌شود. خدمات، عکس و موقعیت از بخش‌های بازشونده در دسترس‌اند. تحویل پروژه به معنی تسویه حساب نیست.'},
 '/customers':{title:'مشتریان',text:'مشتری را با نام یا شماره جست‌وجو کنید. لمس شماره، شماره‌گیر را باز می‌کند. در جزئیات مشتری جمع حساب و پروژه‌های او دیده می‌شوند.'},
 '/activities':{title:'فعالیت روزانه',text:'ابتدا گزارش‌ها را مرور کنید. با «فعالیت جدید» فرم باز می‌شود. مقدار و مبلغ اختیاری‌اند. مبلغ فعالیت فقط یادداشت است؛ کار خارج از قرارداد را در کار اضافه ثبت کنید. اصلاح و حذف دلیل می‌خواهند.'},
 '/finance':{title:'حساب و اسناد',text:'طلب پروژه = قرارداد + کار اضافه − تخفیف. فاکتور پروژه دوباره طلب ایجاد نمی‌کند. فاکتور مستقل صادرشده طلب جداست. مانده مثبت بدهکاری و مانده منفی بستانکاری مشتری است. سند را پیش‌نمایش، سپس چاپ یا اشتراک‌گذاری کنید.'},
 '/calendar':{title:'تقویم',text:'روز دارای رویداد را لمس کنید. یک مورد مستقیم باز می‌شود؛ برای چند مورد فهرست انتخابی نمایش داده می‌شود. فعالیت، یادآوری و موعد پروژه با برچسب مشخص‌اند.'},
 '/reminders':{title:'یادآوری‌ها',text:'عنوان، تاریخ و در صورت نیاز پروژه را انتخاب کنید. نام پروژه و مشتری کنار یادآوری دیده می‌شود. انجام‌شده‌کردن، سابقه را حذف نمی‌کند.'},
 '/services':{title:'خدمات',text:'خدمات معمول و قیمت پایه را ثبت کنید. قیمت هر پروژه مستقل است و با ویرایش قیمت پایه عوض نمی‌شود.'},
 '/reports':{title:'گزارش‌ها',text:'جمع حساب‌ها از همان سیاست صفحه مالی پیروی می‌کند. برای بکاپ و بازیابی از لینک تنظیمات استفاده کنید.'},
 '/settings':{title:'تنظیمات',text:'قفل ورود، اطلاعات کسب‌وکار، ظاهر، بکاپ و راهنما اینجاست. بکاپ شامل عکس‌ها و تنظیمات کسب‌وکار است. قفل محلی رمزگذاری اطلاعات نیست و داخل بکاپ منتقل نمی‌شود.'},
 '/help':{title:'راهنمای کامل',text:'راهنمای هر بخش و آموزش کامل برنامه را در این صفحه بخوانید.'},
}
export function PageHelp(){const path=useRouterState({select:s=>s.location.pathname});const topic=Object.entries(helpTopics).filter(([key])=>key!=='/'&&path.startsWith(key)).at(-1)?.[1]??helpTopics['/'];const [open,setOpen]=useState(false);const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close()},[open])
 return <><button aria-label="راهنمای این صفحه" className="min-h-11 min-w-11 border rounded-full" onClick={()=>setOpen(true)}>؟</button><dialog ref={dialog} onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)} className="m-auto max-w-lg w-[90vw] rounded-2xl p-5 backdrop:bg-black/40"><h2 className="font-bold">{topic.title}</h2><p className="my-4 leading-8">{topic.text}</p><div className="flex gap-4"><button autoFocus className="min-h-11" onClick={()=>setOpen(false)}>بستن راهنما</button><Link to="/help" onClick={()=>setOpen(false)} className="min-h-11 text-indigo-700">راهنمای کامل</Link></div></dialog></>
}
export function HelpPage(){return <div className="space-y-4"><h1 className="text-xl font-bold">راهنمای کامل لاین‌یار</h1>{Object.entries(helpTopics).map(([key,topic])=><details key={key} className="rounded-xl border bg-white p-4"><summary className="min-h-11 cursor-pointer font-bold">{topic.title}</summary><p className="leading-8">{topic.text}</p></details>)}<details className="border rounded-xl bg-white p-4"><summary className="min-h-11 cursor-pointer">آموزش کامل تکنسین</summary><div className="whitespace-pre-wrap leading-8 break-words">{guide}</div></details></div>}
