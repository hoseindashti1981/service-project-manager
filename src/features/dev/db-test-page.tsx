import { useEffect, useState } from 'react'
import { customerRepository } from '@/db/repositories/customer-repository'
import { projectRepository } from '@/db/repositories/project-repository'
import { serviceRepository } from '@/db/repositories/service-repository'
import { seedDefaultServices } from '@/db/seed'
import type { Customer } from '@/domain/customer/types'
import type { Project } from '@/domain/project/types'
import type { Service } from '@/domain/service/types'

export function DbTestPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [message, setMessage] = useState('')

  // بارگذاری اولیه داده‌ها
  async function loadData() {
    const [c, p, s] = await Promise.all([
      customerRepository.getAll(),
      projectRepository.getAll(),
      serviceRepository.getAll(),
    ])
    setCustomers(c)
    setProjects(p)
    setServices(s)
  }

  useEffect(() => {
    loadData()
  }, [])

  // ساخت مشتری تست
  async function handleCreateCustomer() {
    try {
      const customer = await customerRepository.create({
        name: 'آقای حسینی',
        mobile: '09121234567',
        description: 'مشتری تست',
      })
      setMessage(`مشتری ساخته شد: ${customer.name}`)
      await loadData()
    } catch (err) {
      setMessage('خطا در ساخت مشتری')
      console.error(err)
    }
  }

  // ساخت پروژه تست
  async function handleCreateProject() {
    try {
      if (customers.length === 0) {
        setMessage('اول یک مشتری بساز')
        return
      }

      const project = await projectRepository.create({
        customerId: customers[0].id,
        title: 'پروژه مهرویلا',
        address: 'کرج، مهرویلا',
        status: 'active',
        description: 'پروژه تست',
      })
      setMessage(`پروژه ساخته شد: ${project.title}`)
      await loadData()
    } catch (err) {
      setMessage('خطا در ساخت پروژه')
      console.error(err)
    }
  }

  // ساخت سرویس‌های پیش‌فرض
  async function handleSeedServices() {
    try {
      await seedDefaultServices()
      setMessage('سرویس‌های پیش‌فرض اضافه شدند')
      await loadData()
    } catch (err) {
      setMessage('خطا در ساخت سرویس‌ها')
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">صفحه تست دیتابیس (Phase 1)</h2>

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-sm">
          {message}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleCreateCustomer}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm"
        >
          ساخت مشتری تست
        </button>

        <button
          onClick={handleCreateProject}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm"
        >
          ساخت پروژه تست
        </button>

        <button
          onClick={handleSeedServices}
          className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          افزودن سرویس‌های پیش‌فرض
        </button>
      </div>

      {/* لیست مشتریان */}
      <section className="bg-white border rounded-xl p-4">
        <h3 className="font-bold mb-2">مشتریان ({customers.length})</h3>
        {customers.length === 0 ? (
          <p className="text-slate-500 text-sm">هنوز مشتریی وجود ندارد</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {customers.map((c) => (
              <li key={c.id}>
                {c.name} — {c.mobile}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* لیست پروژه‌ها */}
      <section className="bg-white border rounded-xl p-4">
        <h3 className="font-bold mb-2">پروژه‌ها ({projects.length})</h3>
        {projects.length === 0 ? (
          <p className="text-slate-500 text-sm">هنوز پروژه‌ای وجود ندارد</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {projects.map((p) => (
              <li key={p.id}>
                {p.title} — وضعیت: {p.status}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* لیست سرویس‌ها */}
      <section className="bg-white border rounded-xl p-4">
        <h3 className="font-bold mb-2">سرویس‌ها ({services.length})</h3>
        {services.length === 0 ? (
          <p className="text-slate-500 text-sm">هنوز سرویسی وجود ندارد</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {services.map((s) => (
              <li key={s.id}>
                {s.name} — واحد: {s.defaultUnit}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}