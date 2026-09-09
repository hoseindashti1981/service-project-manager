import {useEffect, useState} from 'react'
import {liveQuery} from 'dexie'
import {db} from '@/db/db'
import {serviceProgress} from '@/domain/activity/progress'

export function ProjectProgress({projectId}: {projectId: string}) {
  const [percent, setPercent] = useState<number | null>(null)
  useEffect(() => {
    const subscription = liveQuery(async () => {
      const [items, activities] = await Promise.all([
        db.projectItems.where('projectId').equals(projectId).toArray(),
        db.projectActivities.where('projectId').equals(projectId).toArray(),
      ])
      return items.length ? Math.round(items.reduce((sum, item) => sum + serviceProgress(item, activities).percent, 0) / items.length) : 0
    }).subscribe({next: setPercent, error: () => setPercent(null)})
    return () => subscription.unsubscribe()
  }, [projectId])
  return <div className="col-span-2 pt-1" title="میانگین پیشرفت خدمات پروژه">
    <div className="mb-1 flex justify-between text-[11px] text-slate-500"><span>پیشرفت کلی</span><span>{percent === null ? '—' : `${percent.toLocaleString('fa-IR')}٪`}</span></div>
    <div role="progressbar" aria-label="پیشرفت کلی پروژه" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent ?? undefined} className="h-2 overflow-hidden rounded-full bg-emerald-100">
      <div className="h-full rounded-full bg-emerald-500 transition-[width] motion-reduce:transition-none" style={{width: `${percent ?? 0}%`}} />
    </div>
  </div>
}
