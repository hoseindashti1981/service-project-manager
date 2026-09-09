import {useState} from 'react'
import {useBusiness} from '@/domain/use-business'
import {db} from '@/db/db'
import {defaultSettings} from '@/domain/media'
import {dashboardOrderOptions,defaultDashboardOrder,validDashboardOrder,type DashboardOrderStatus} from '@/domain/project/dashboard-order'
import {projectStatusLabels} from '@/domain/project/status'
export function DashboardOrderSettings(){const business=useBusiness(),[busy,setBusy]=useState(false),[error,setError]=useState('');const order=validDashboardOrder(business.dashboardProjectOrder)?business.dashboardProjectOrder:defaultDashboardOrder
 async function change(index:number,status:DashboardOrderStatus){setBusy(true);setError('');try{await db.transaction('rw',db.appSettings,async()=>{const current=await db.appSettings.get('business')||defaultSettings,next=[...(validDashboardOrder(current.dashboardProjectOrder)?current.dashboardProjectOrder:defaultDashboardOrder)],other=next.indexOf(status);[next[index],next[other]]=[next[other],next[index]];await db.appSettings.put({...current,dashboardProjectOrder:next,updatedAt:Date.now()})})}catch{setError('ترتیب ذخیره نشد؛ دوباره تلاش کنید.')}finally{setBusy(false)}}
 return <section className="space-y-3 rounded-xl border bg-white p-4"><h2 className="font-bold">ترتیب لیست پروژه‌های داشبورد</h2>{['اول','دوم','سوم','چهارم'].map((label,index)=><label className="block" key={label}>{label}<select disabled={busy} aria-label={'اولویت '+label} className="w-full rounded-lg border p-2" value={order[index]} onChange={e=>void change(index,e.target.value as DashboardOrderStatus)}>{dashboardOrderOptions.map(status=><option key={status} value={status}>{projectStatusLabels[status]}</option>)}</select></label>)}<p className="text-xs">ترتیب خودکار ذخیره می‌شود. با انتخاب وضعیت تکراری، جای دو اولویت عوض می‌شود. پروژه‌های برنامه‌ریزی‌شده و تکمیل‌شده پس از این چهار گروه نمایش داده می‌شوند.</p>{error&&<p role="alert">{error}</p>}</section>
}
