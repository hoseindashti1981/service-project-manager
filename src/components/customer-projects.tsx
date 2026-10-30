import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { Link } from '@tanstack/react-router'
import { db } from '@/db/db'
import { projectStatusLabels } from '@/domain/project/status'
import type { Project } from '@/domain/project/types'
import { AccountCard } from './account-card'

export function CustomerProjects({ customerId }: { customerId: string }) {
  const [projects, setProjects] = useState<Project[]>([])
  useEffect(() => {
    const subscription = liveQuery(() => db.projects.where('customerId').equals(customerId).toArray()).subscribe(setProjects)
    return () => subscription.unsubscribe()
  }, [customerId])

  return <section className="space-y-3" aria-label="حساب پروژه‌های مشتری">
    <div><h2 className="font-bold text-slate-900">پروژه‌های این مشتری</h2><p className="mt-1 text-xs text-slate-500">وضعیت مالی هر پروژه جداگانه و با همان محاسبات حسابداری</p></div>
    {projects.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">هنوز پروژه‌ای برای این مشتری ثبت نشده است.</p>}
    {projects.map((project) => <div key={project.id} className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><Link className="inline-flex min-h-11 items-center font-bold text-indigo-700" to="/projects/$projectId" params={{ projectId: project.id }}>{project.title}</Link><span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600">{projectStatusLabels[project.status]}</span></div><AccountCard projectId={project.id} title={`حساب پروژه ${project.title}`} /></div>)}
  </section>
}
