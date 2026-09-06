import { phoneNumber } from '@/domain/customer/contact'
import { JalaliDatePicker } from '@/components/jalali-date-picker'
import { toISODate } from '@/lib/dates'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { customerRepository } from '@/db/repositories/customer-repository'
import { isValidMobile, isNonEmpty } from '@/lib/validation'
import type { Customer } from '@/domain/customer/types'
import { formatDateFa } from '@/lib/dates'

export function CustomerDetailPage() {
  const navigate = useNavigate()
  const { customerId } = useParams({ from: '/customers/$customerId' })

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [date, setDate] = useState(toISODate)
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // بارگذاری مشتری
  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const data = await customerRepository.getById(customerId)
        if (!data) {
          setError('مشتری یافت نشد')
          return
        }
        setDate(data.date || toISODate(new Date(data.createdAt)))
        setCustomer(data)
        setName(data.name)
        setMobile(data.mobile)
        setDescription(data.description || '')
      } catch (err) {
        console.error(err)
        setError('خطا در بارگذاری مشتری')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [customerId])

  // ذخیره تغییرات
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (!isNonEmpty(name)) {
      setError('نام مشتری الزامی است')
      return
    }

    if (!isValidMobile(mobile)) {
      setError('شماره موبایل معتبر نیست')
      return
    }

    try {
      setSaving(true)
      const updated = await customerRepository.update(customerId, {
        date,
        name: name.trim(),
        mobile: mobile.trim(),
        description: description.trim() || undefined,
      })
      setCustomer(updated)
      setMessage('تغییرات با موفقیت ذخیره شد')
    } catch (err) {
      console.error(err)
      setError('خطا در ذخیره تغییرات')
    } finally {
      setSaving(false)
    }
  }

  // حذف مشتری
  async function handleDelete() {
    if (!confirm('آیا از حذف این مشتری مطمئن هستید؟')) return

    try {
      await customerRepository.delete(customerId)
      navigate({ to: '/customers' })
    } catch (err) {
      console.error(err)
      setError('خطا در حذف مشتری')
    }
  }

  if (loading) {
    return <div className="text-center py-10 text-slate-500">در حال بارگذاری...</div>
  }

  if (error && !customer) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {error}
        </div>
        <button
          onClick={() => navigate({ to: '/customers' })}
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
        <h2 className="text-xl font-bold text-slate-800">ویرایش مشتری</h2>
        <button
          onClick={() => navigate({ to: '/customers' })}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          بازگشت
        </button>
      </div>

      {customer && <a href={`tel:${phoneNumber(customer.mobile)}`} className="inline-flex min-h-11 items-center rounded-lg bg-emerald-50 px-4 text-emerald-800">تماس با مشتری: <span dir="ltr">{customer.mobile}</span></a>}
      {customer && (
        <div className="text-xs text-slate-400">
          ایجاد شده در: {formatDateFa(customer.date || customer.createdAt)}
        </div>
      )}

      <div><p className="mb-1 text-sm">تاریخ ثبت مشتری (شمسی)</p><JalaliDatePicker label="تاریخ مشتری" value={date} onChange={setDate} /></div>
      <form onSubmit={handleSave} className="space-y-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            نام مشتری <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            شماره موبایل <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            dir="ltr"
          />
        </div>

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
