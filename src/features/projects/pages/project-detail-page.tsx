import { useEffect, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { projectRepository } from '@/db/repositories/project-repository'
import { customerRepository } from '@/db/repositories/customer-repository'
import type { Project, ProjectStatus } from '@/domain/project/types'
import type { Customer } from '@/domain/customer/types'
import { isNonEmpty } from '@/lib/validation'
import { formatDateFa } from '@/lib/dates'
import { FinancialPanel } from '../components/financial-panel'

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'planned', label: 'برنامه‌ریزی‌شده' },
  { value: 'active', label: 'فعال' },
  { value: 'paused', label: 'متوقف' },
  { value: 'completed', label: 'تکمیل‌شده' },
  { value: 'delivered', label: 'تحویل‌شده' },
  { value: 'cancelled', label: 'لغو‌شده' },
]

export function ProjectDetailPage() {
  const navigate = useNavigate()
  const { projectId } = useParams({ from: '/projects/$projectId' })

  const [project, setProject] = useState<Project | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState('')
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState('')
  const [workType, setWorkType] = useState('')
  const [contractAmount, setContractAmount] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('draft')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [proj, customerList] = await Promise.all([
          projectRepository.getById(projectId),
          customerRepository.getAll(),
        ])

        if (!proj) {
          setError('پروژه یافت نشد')
          return
        }

        setProject(proj)
        setCustomers(customerList)
        setCustomerId(proj.customerId)
        setTitle(proj.title)
        setAddress(proj.address || '')
        setWorkType(proj.workType || '')
        setContractAmount(String(proj.contractAmount || ''))
        setStatus(proj.status)
        setDescription(proj.description || '')
      } catch (err) {
        console.error(err)
        setError('خطا در بارگذاری پروژه')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (!customerId) {
      setError('انتخاب مشتری الزامی است')
      return
    }

    if (!isNonEmpty(title)) {
      setError('عنوان پروژه الزامی است')
      return
    }

    try {
      setSaving(true)
      const updated = await projectRepository.update(projectId, {
        customerId,
        title: title.trim(),
        address: address.trim() || undefined,
        workType: workType.trim() || undefined,
        contractAmount: Number(contractAmount) || 0,
        status,
        description: description.trim() || undefined,
      })
      setProject(updated)
      setMessage('تغییرات با موفقیت ذخیره شد')
    } catch (err) {
      console.error(err)
      setError('خطا در ذخیره تغییرات')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('آیا از حذف این پروژه مطمئن هستید؟')) return

    try {
      await projectRepository.delete(projectId)
      navigate({ to: '/projects' })
    } catch (err) {
      console.error(err)
      setError('خطا در حذف پروژه')
    }
  }

  if (loading) {
    return <div className="text-center py-10 text-slate-500">در حال بارگذاری...</div>
  }

  if (error && !project) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {error}
        </div>
        <button
          onClick={() => navigate({ to: '/projects' })}
          className="text-sm text-slate-600"
        >
          ← بازگشت به لیست
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">ویرایش پروژه</h2>
        <button
          onClick={() => navigate({ to: '/projects' })}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          بازگشت
        </button>
      </div>

      {project && (
        <div className="text-xs text-slate-400">
          ایجاد شده در: {formatDateFa(project.createdAt)}
        </div>
      )}

      {project && <FinancialPanel projectId={project.id} contractAmount={project.contractAmount || 0} />}

      <form onSubmit={handleSave} className="space-y-4 bg-white border border-slate-200 rounded-xl p-5">
        {/* مشتری */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            مشتری <span className="text-red-500">*</span>
          </label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.mobile}
              </option>
            ))}
          </select>
        </div>

        {/* عنوان */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            عنوان پروژه <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        {/* آدرس */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            آدرس
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        {/* نوع کار */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            نوع کار
          </label>
          <input
            type="text"
            value={workType}
            onChange={(e) => setWorkType(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ توافق اولیه (تومان)</label>
          <input type="number" min="0" value={contractAmount} onChange={(e) => setContractAmount(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
        </div>

        {/* وضعیت */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            وضعیت
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* توضیحات */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            توضیحات
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-3 text-sm">
            {message}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-60"
          >
            {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2.5 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50"
          >
            حذف
          </button>
        </div>
      </form>
    </div>
  )
}
