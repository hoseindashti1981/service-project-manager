import {LocationPermissionHelp} from './location-permission-help'
import {CoordinateEntry} from './coordinate-entry'
import {isStandalone} from '@/lib/pwa-display'
import {useCallback,useEffect,useRef,useState} from 'react'
import {map as createMap,tileLayer,marker,divIcon,type Map,type Marker} from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface ProjectPoint {latitude:number;longitude:number}
function PointMap({point,onPick}:{point?:ProjectPoint;onPick:(point:ProjectPoint)=>void}) {
  const element=useRef<HTMLDivElement>(null),map=useRef<Map|null>(null),pin=useRef<Marker|null>(null)
  const pick=useRef(onPick),initial=useRef(point)
  const [failed,setFailed]=useState(false)
  useEffect(()=>{pick.current=onPick},[onPick])
  useEffect(()=>{
    const position=initial.current
    const view=createMap(element.current!,{scrollWheelZoom:false}).setView(position?[position.latitude,position.longitude]:[35.6892,51.389],position?16:6)
    map.current=view
    tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).on('tileerror',()=>setFailed(true)).addTo(view)
    view.on('click',e=>pick.current({latitude:e.latlng.lat,longitude:e.latlng.wrap().lng}))
    return()=>{view.remove();map.current=null;pin.current=null}
  },[])
  useEffect(()=>{
    const view=map.current;if(!view)return
    if(!point){pin.current?.remove();pin.current=null;return}
    const latlng:[number,number]=[point.latitude,point.longitude]
    if(!pin.current){pin.current=marker(latlng,{draggable:true,icon:divIcon({html:'📍',className:'project-map-pin',iconSize:[32,40],iconAnchor:[16,36]}),title:'محل پروژه'}).addTo(view);pin.current.on('dragend',()=>{const p=pin.current!.getLatLng();pick.current({latitude:p.lat,longitude:p.wrap().lng})})}
    else pin.current.setLatLng(latlng)
    view.setView(latlng,Math.max(view.getZoom(),15))
  },[point])
  return <div className="space-y-2"><div ref={element} aria-label="نقشه انتخاب محل پروژه" className="project-map relative z-0 h-72 w-full rounded-xl"/>{failed&&<p role="status" className="text-sm text-amber-800">تصویر نقشه دریافت نشد؛ اینترنت را بررسی کنید. دریافت موقعیت گوشی همچنان قابل امتحان است.</p>}<p className="text-xs">برای انتخاب، روی نقشه بزنید یا نشانگر را جابه‌جا کنید. نقشه با اینترنت و OpenStreetMap نمایش داده می‌شود.</p></div>
}

export function LocationField({point,onChange,disabled=false}:{point?:ProjectPoint;onChange:(point?:ProjectPoint)=>void;disabled?:boolean}) {
  const [open,setOpen]=useState(false),[tracking,setTracking]=useState(false),[accuracy,setAccuracy]=useState<number>(),[error,setError]=useState(''),[copyMessage,setCopyMessage]=useState('')
  const watch=useRef<number|null>(null),generation=useRef(0),wrapper=useRef<HTMLDivElement>(null)
  const clear=useCallback(()=>{generation.current++;if(watch.current!==null){navigator.geolocation.clearWatch(watch.current);watch.current=null}},[])
  useEffect(()=>{const stop=()=>{clear();setTracking(false)},pause=()=>{if(document.hidden)stop()},form=wrapper.current?.closest('form');form?.addEventListener('submit',stop);document.addEventListener('visibilitychange',pause);return()=>{form?.removeEventListener('submit',stop);document.removeEventListener('visibilitychange',pause);clear()}},[clear])
  function stop(){clear();setTracking(false)}
  function locate(){
    if(watch.current!==null){stop();return}
    setError('');if(!navigator.geolocation){setError('موقعیت‌یابی در این مرورگر پشتیبانی نمی‌شود.');return}
    clear();const request=generation.current;setTracking(true)
    watch.current=navigator.geolocation.watchPosition(position=>{
      if(request!==generation.current)return
      onChange({latitude:position.coords.latitude,longitude:position.coords.longitude});setAccuracy(Math.round(position.coords.accuracy))
    },error=>{if(request!==generation.current)return;stop();setError(error.code===1?(isStandalone()?'دسترسی موقعیت در نسخه نصب‌شده رد شد (کد ۱). اگر در Safari کار می‌کند، مجوز مرورگر مشکل این نسخه را حل نکرده است. از نقشه انتخاب کنید یا مختصات مرورگر را در بخش «واردکردن مختصات» بچسبانید.':'دسترسی موقعیت این صفحه رد شد (کد ۱)؛ اجازه مکان سایت را بررسی کنید یا از نقشه انتخاب کنید.'):error.code===3?'مهلت دریافت موقعیت تمام شد (کد ۳)؛ دوباره در فضای باز امتحان کنید.':'موقعیت دستگاه در دسترس نیست (کد ۲)؛ مکان‌یابی گوشی را بررسی و دوباره امتحان کنید.')},{enableHighAccuracy:true,maximumAge:0,timeout:15000})
  }
  function pick(value:ProjectPoint){stop();setAccuracy(undefined);setError('');onChange(value)}
  return <div ref={wrapper} className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/40 p-3">
    <div className="flex flex-wrap gap-2"><button type="button" disabled={disabled} className="min-h-11 rounded-lg border bg-white px-3 text-sm" onClick={()=>setOpen(!open)}>{open?'بستن نقشه':'انتخاب از نقشه'}</button><button type="button" disabled={disabled} className="min-h-11 rounded-lg border bg-white px-3 text-sm" onClick={locate}>{tracking&&!disabled?'توقف موقعیت زنده':'دریافت موقعیت زنده گوشی'}</button></div>
    {tracking&&!disabled&&<p role="status" className="text-sm">موقعیت زنده فعال است؛ پس از رسیدن به محل پروژه، آن را متوقف کنید.</p>}
    {point&&<div className="text-sm"><p>موقعیت انتخاب‌شده: <span dir="ltr">{point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}</span></p>{accuracy!==undefined&&<p>دقت تقریبی: {accuracy.toLocaleString('fa-IR')} متر</p>}<a className="inline-block min-h-11 py-2 text-indigo-700" href={`https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`} target="_blank" rel="noreferrer">بررسی موقعیت در نقشه</a><button type="button" disabled={disabled} className="min-h-11 px-3 text-rose-700" onClick={()=>{stop();setAccuracy(undefined);onChange(undefined)}}>حذف موقعیت</button></div>}
    {open&&!disabled&&<PointMap point={point} onPick={pick}/>}
    <p className="text-xs text-slate-600">مختصات همراه پروژه ذخیره می‌شود. آدرس نوشتاری را برای پلاک و توضیحات تکمیل کنید؛ انتخاب موقعیت متن آدرس را پاک نمی‌کند.</p>
    {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}
    {point&&<><button type="button" disabled={disabled} className="min-h-11 rounded-lg border px-3 text-sm" onClick={async()=>{try{await navigator.clipboard.writeText(`${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`);setCopyMessage('مختصات کپی شد.')}catch{setCopyMessage('کپی خودکار انجام نشد؛ مقدار زیر را انتخاب و دستی کپی کنید.')}}}>کپی موقعیت انتخاب‌شده</button><input aria-label="موقعیت قابل کپی" readOnly dir="ltr" className="w-full rounded-lg border p-2" value={`${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`} onFocus={e=>e.target.select()}/></>}
    {copyMessage&&<p role="status" className="text-sm">{copyMessage}</p>}
    <CoordinateEntry disabled={disabled} onPick={pick}/>
    <LocationPermissionHelp/>
  </div>
}
