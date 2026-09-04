import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { projectRepository } from '@/db/repositories/project-repository'
import { customerRepository } from '@/db/repositories/customer-repository'
import type { Customer } from '@/domain/customer/types'
import type { ProjectStatus } from '@/domain/project/types'
import { isNonEmpty } from '@/lib/validation'

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'planned', label: 'برنامه‌ریزی‌شده' },
  { value: 'active', label: 'فعال' },
  { value: 'paused', label: 'متوقف' },
  { value: 'completed', label: 'تکمیل‌شده' },
  { value: 'delivered', label: 'تحویل‌شده' },
  { value: 'cancelled', label: 'لغو‌شده' },
]

export function ProjectFormPage() {
  const navigate = useNavigate()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState('')
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState('')
  const [workType, setWorkType] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('draft')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // بارگذاری لیست مشتریان
  useEffect(() => {
    async function loadCustomers() {
      const list = await customerRepository.getAll()
      setCustomers(list)
      if (list.length > 0) {
        setCustomerId(list[0].id) // اولین مشتری را پیش‌فرض انتخاب کن
      }
    }
    loadCustomers()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!customerId) {
      setError('انتخاب مشتری الزامی است')
      return
    }

    if (!isNonEmpty(title)) {
      setError('عنوان پروژه الزامی است')
      return
    }

    try {
      setLoading(true)

      await projectRepository.create({
        customerId,
        title: title.trim(),
        address: address.trim() || undefined,
        workType: workType.trim() || undefined,
        status,
        description: description.trim() || undefined,
      })

      navigate({ to: '/projects' })
    } catch (err) {
      console.error(err)
      setError('خطا در ذخیره پروژه')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">پروژه جدید</h2>
        <button
          type="button"
          onClick={() => navigate({ to: '/projects' })}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          انصراف
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-slate-200 rounded-xl p-5">
        {/* انتخاب مشتری */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            مشتری <span className="text-red-500">*</span>
          </label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {customers.length === 0 && (
              <option value="">ابتدا یک مشتری بسازید</option>
            )}
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
            placeholder="مثال: پروژه مهرویلا"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            autoFocus
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
            placeholder="آدرس محل پروژه"
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
            placeholder="مثال: نور خطی، سیستم صوتی"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
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

        <button
          type="submit"
          disabled={loading || customers.length === 0}
          className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-60"
        >
          {loading ? 'در حال ذخیره...' : 'ذخیره پروژه'}
        </button>
      </form>
    </div>
  )
}