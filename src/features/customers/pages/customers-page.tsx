import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { customerRepository } from '@/db/repositories/customer-repository'
import type { Customer } from '@/domain/customer/types'
import { formatDateFa } from '@/lib/dates'

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  async function loadCustomers(query = '') {
    try {
      setLoading(true)
      setError(null)

      const data = query.trim()
        ? await customerRepository.search(query)
        : await customerRepository.getAll()

      setCustomers(data)
    } catch (err) {
      console.error(err)
      setError('خطا در بارگذاری مشتریان')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  async function handleSearch(value: string) {
    setSearch(value)
    await loadCustomers(value)
  }

  return (
    <div className="space-y-4">
      {/* هدر صفحه */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">مشتریان</h2>
        <Link
          to="/customers/new"
          className="bg-slate-800 text-white text-sm px-4 py-2 rounded-lg"
        >
          + مشتری جدید
        </Link>
      </div>

      {/* جستجو */}
      <input
        type="text"
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="جستجو بر اساس نام یا موبایل..."
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
      />

      {/* حالت‌ها */}
      {loading && (
        <div className="text-slate-500 text-sm py-8 text-center">
          در حال بارگذاری...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && customers.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-500">هنوز مشتریی ثبت نشده است.</p>
        </div>
      )}

      {/* لیست مشتریان */}
      {!loading && customers.length > 0 && (
        <div className="space-y-3">
          {customers.map((customer) => (
            <Link
            key={customer.id}
            to="/customers/$customerId"
            params={{ customerId: customer.id }}
            className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-400 transition"
>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-800">{customer.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{customer.mobile}</p>
                  {customer.description && (
                    <p className="text-sm text-slate-400 mt-1 line-clamp-1">
                      {customer.description}
                    </p>
                  )}
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {formatDateFa(customer.date || customer.createdAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
