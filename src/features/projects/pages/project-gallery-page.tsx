import {useEffect,useState} from 'react'
import {Link,useParams} from '@tanstack/react-router'
import {liveQuery} from 'dexie'
import {db} from '@/db/db'
import {ProjectPhotos} from '../components/project-photos'
export function ProjectGalleryPage(){
 const {projectId}=useParams({from:'/projects/$projectId/photos'})
 const [data,setData]=useState<{title:string;customer:string}|null>(),[error,setError]=useState('')
 useEffect(()=>{window.scrollTo(0,0);const s=liveQuery(async()=>{const p=await db.projects.get(projectId);return p?{title:p.title,customer:(await db.customers.get(p.customerId))?.name||'مشتری نامشخص'}:null}).subscribe({next:setData,error:()=>setError('خواندن گالری انجام نشد.')});return()=>s.unsubscribe()},[projectId])
 return <div className="space-y-3"><Link to="/projects" className="inline-block min-h-11 text-indigo-700">بازگشت به پروژه‌ها</Link>{error?<p role="alert">{error}</p>:data===undefined?<p role="status">در حال بارگذاری…</p>:data===null?<p>پروژه یافت نشد.</p>:<><h1 className="text-lg font-bold">🖼️ گالری عکس‌ها — {data.title}</h1><p className="text-sm text-slate-500">{data.customer}</p><ProjectPhotos key={projectId} projectId={projectId} standalone/></>}</div>
}
