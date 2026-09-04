import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { activityRepository } from '@/db/repositories/activity-repository'
import { projectRepository } from '@/db/repositories/project-repository'
import type { ProjectActivity } from '@/domain/activity/types'
import type { Project } from '@/domain/project/types'
import { toISODate } from '@/lib/dates'

export function TodayActivitiesPage() {
  const [activities, setActivities] = useState<ProjectActivity[]>([])
  const [projects, setProjects] = useState<Record<string, Project>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // فرم ثبت سریع
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [title, setTitle] = useState('')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      const [acts, projectList] = await Promise.all([
        activityRepository.getToday(),
        projectRepository.getAll(),
      ])

      const projectMap: Record<string, Project> = {}
      projectList.forEach((p) => {
        projectMap[p.id] = p
      })

      setActivities(acts)
      setProjects(projectMap)

      // اگر پروژه‌ای وجود داشت، اولین را پیش‌فرض انتخاب کن
      if (projectList.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectList[0].id)
      }
    } catch (err) {
      console.error(err)
      setError('خطا در بارگذاری فعالیت‌ها')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (!selectedProjectId) {
      setMessage('یک پروژه انتخاب کنید')
      return
    }
    if (!title.trim()) {
      setMessage('عنوان فعالیت الزامی است')
      return
    }

    try {
      setSaving(true)

      await activityRepository.create({
        projectId: selectedProjectId,
        date: toISODate(),
        title: title.trim(),
        quantity: quantity ? Number(quantity) : undefined,
        note: note.trim() || undefined,
      })

      setTitle('')
      setQuantity('')
      setNote('')
      setMessage('فعالیت با موفقیت ثبت شد')
      await loadData()
    } catch (err) {
      console.error(err)
      setMessage('خطا در ثبت فعالیت')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">فعالیت‌های امروز</h2>
        <Link to="/projects" className="text-sm text-slate-500 hover:text-slate-700">
          لیست پروژه‌ها
        </Link>
      </div>

      {/* فرم ثبت سریع */}
      <form
        onSubmit={handleQuickAdd}
        className="bg-white border border-slate-200 rounded-xl p-4 space-y-3"
      >
        <h3 className="font-medium text-slate-700 text-sm">ثبت سریع فعالیت</h3>

        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
        >
          {Object.values(projects).length === 0 && (
            <option value="">ابتدا یک پروژه بسازید</option>
          )}
          {Object.values(projects).map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان فعالیت (مثلاً: ۸ متر نور خطی نصب شد)"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />

        <div className="flex gap-2">
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="مقدار (اختیاری)"
            className="w-1/3 border border-slate-300 rounded-lg px-3 py-2 text-sm"
            dir="ltr"
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="یادداشت (اختیاری)"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {message && (
          <div className={`text-sm p-2 rounded-lg ${message.includes('موفقیت') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || Object.keys(projects).length === 0}
          className="w-full bg-slate-800 text-white py-2 rounded-lg text-sm disabled:opacity-60"
        >
          {saving ? 'در حال ثبت...' : 'ثبت فعالیت'}
        </button>
      </form>

      {/* لیست فعالیت‌های امروز */}
      {loading && (
        <div className="text-center text-slate-500 py-6">در حال بارگذاری...</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {!loading && activities.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500">
          هنوز فعالیتی برای امروز ثبت نشده است.
        </div>
      )}

      {!loading && activities.length > 0 && (
        <div className="space-y-3">
          {activities.map((act) => (
            <div
              key={act.id}
              className="bg-white border border-slate-200 rounded-xl p-4"
            >
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h4 className="font-medium text-slate-800">{act.title}</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    {projects[act.projectId]?.title || 'پروژه نامشخص'}
                  </p>
                  {act.note && (
                    <p className="text-sm text-slate-400 mt-1">{act.note}</p>
                  )}
                </div>
                {act.quantity !== undefined && (
                  <span className="text-sm font-medium text-slate-600">
                    {act.quantity}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}