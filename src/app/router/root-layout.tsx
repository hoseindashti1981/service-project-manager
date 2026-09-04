import { Outlet } from '@tanstack/react-router'

export function RootLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* هدر ساده موقت */}
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <h1 className="text-lg font-bold text-slate-800">
          مدیریت پروژه و خدمات فنی
        </h1>
      </header>

      {/* محتوای صفحات */}
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  )
}