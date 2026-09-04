import { Link, Outlet } from '@tanstack/react-router'
import { useState } from 'react'

export function RootLayout() {
  const [open, setOpen] = useState(false)
  const links = [['/', 'داشبورد'], ['/customers', 'مشتری‌ها'], ['/projects', 'پروژه‌ها'], ['/activities/today', 'فعالیت امروز'], ['/finance', 'مالی']] as const
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3"><Link to="/" className="text-lg font-bold text-slate-800">مدیریت پروژه و خدمات فنی</Link><button onClick={() => setOpen(!open)} className="rounded-lg border px-3 py-1.5 text-sm md:hidden">منو</button><nav className="hidden gap-1 md:flex">{links.map(([to, label]) => <Link key={to} to={to} className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">{label}</Link>)}</nav></div>
        {open && <nav className="mx-auto mt-3 grid max-w-5xl gap-1 border-t pt-3 md:hidden">{links.map(([to, label]) => <Link key={to} to={to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-slate-100">{label}</Link>)}</nav>}
      </header>

      {/* محتوای صفحات */}
      <main className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>
    </div>
  )
}
