import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { customerRepository } from '@/db/repositories/customer-repository'
import { isValidMobile, isNonEmpty } from '@/lib/validation'

export function CustomerFormPage() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // اعتبارسنجی ساده
    if (!isNonEmpty(name)) {
      setError('نام مشتری الزامی است')
      return
    }

    if (!isValidMobile(mobile)) {
      setError('شماره موبایل معتبر نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷)')
      return
    }

    try {
      setLoading(true)

      await customerRepository.create({
        name: name.trim(),
        mobile: mobile.trim(),
        description: description.trim() || undefined,
      })

      // بعد از موفقیت به لیست مشتریان برمی‌گردیم
      navigate({ to: '/customers' })
    } catch (err) {
      console.error(err)
      setError('خطا در ذخیره مشتری')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">مشتری جدید</h2>
        <button
          type="button"
          onClick={() => navigate({ to: '/customers' })}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          انصراف
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-slate-200 rounded-xl p-5">
        {/* نام */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            نام مشتری <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: آقای حسینی"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            autoFocus
          />
        </div>

        {/* موبایل */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            شماره موبایل <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="۰۹۱۲۱۲۳۴۵۶۷"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            dir="ltr"
          />
        </div>

        {/* توضیحات */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            توضیحات (اختیاری)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="آدرس، نکات مهم و ..."
            rows={3}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
          />
        </div>

        {/* پیام خطا */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {/* دکمه ذخیره */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-60"
        >
          {loading ? 'در حال ذخیره...' : 'ذخیره مشتری'}
        </button>
      </form>
    </div>
  )
}