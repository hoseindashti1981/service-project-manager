import { projectStatusLabels as statusLabels, projectStatusOptions } from '@/domain/project/status'
import { useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { projectRepository } from '@/db/repositories/project-repository'
import { customerRepository } from '@/db/repositories/customer-repository'
import type { Project } from '@/domain/project/types'
import type { Customer } from '@/domain/customer/types'
import { formatDateFa } from '@/lib/dates'

export function ProjectsPage() {
  const { status } = useSearch({ from: '/projects' })
  const [projects, setProjects] = useState<Project[]>([])
  const [customers, setCustomers] = useState<Record<string, Customer>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  async function loadData(query = '') {
    try {
      setLoading(true)
      setError(null)

      const [projectList, customerList] = await Promise.all([
        query.trim()
          ? projectRepository.search(query)
          : projectRepository.getAll(),
        customerRepository.getAll(),
      ])

      // تبدیل لیست مشتریان به آبجکت برای دسترسی سریع
      const customerMap: Record<string, Customer> = {}
      customerList.forEach((c) => {
        customerMap[c.id] = c
      })

      setProjects(projectList)
      setCustomers(customerMap)
    } catch (err) {
      console.error(err)
      setError('خطا در بارگذاری پروژه‌ها')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleSearch(value: string) {
    setSearch(value)
    await loadData(value)
  }

  const visibleProjects = projects.filter((project) => !status || project.status === status)
  return (
    <div className="space-y-4">
      {/* هدر */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">پروژه‌ها</h2>
        <Link
          to="/projects/new"
          className="bg-slate-800 text-white text-sm px-4 py-2 rounded-lg"
        >
          + پروژه جدید
        </Link>
      </div>

      {/* جستجو */}
      <input
        type="text"
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="جستجو بر اساس عنوان یا آدرس..."
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
      />

      <div className="flex flex-wrap gap-2"><Link to="/projects" search={{}} className={`rounded-lg border px-3 py-2 text-sm ${!status ? 'bg-indigo-600 text-white' : 'bg-white'}`}>همه</Link>{projectStatusOptions.map((item) => <Link key={item.value} to="/projects" search={{ status: item.value }} className={`rounded-lg border px-3 py-2 text-sm ${status === item.value ? 'bg-indigo-600 text-white' : 'bg-white'}`}>{item.label}</Link>)}</div>
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

      {!loading && !error && visibleProjects.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-500">پروژه‌ای در این فهرست وجود ندارد.</p>
        </div>
      )}

      {/* لیست پروژه‌ها */}
      {!loading && visibleProjects.length > 0 && (
        <div className="space-y-3">
          {visibleProjects.map((project) => (
            <Link
              key={project.id}
              to="/projects/$projectId"
              params={{ projectId: project.id }}
              className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-400 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-800">{project.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {customers[project.customerId]?.name || 'مشتری نامشخص'}
                  </p>
                  {project.address && (
                    <p className="text-sm text-slate-400 mt-1 line-clamp-1">
                      {project.address}
                    </p>
                  )}
                </div>
                <div className="text-left">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                    {statusLabels[project.status] || project.status}
                  </span>
                  <div className="text-xs text-slate-400 mt-2">
                    {formatDateFa(project.startDate || project.createdAt)}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
