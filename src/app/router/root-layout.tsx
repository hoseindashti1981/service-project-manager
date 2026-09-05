import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { BarChart3, ClipboardList, FolderKanban, Home, Menu, MoreHorizontal, Users, WalletCards, X } from 'lucide-react'
import { useState } from 'react'

const navigation = [
  { to: '/', label: 'داشبورد', icon: Home },
  { to: '/projects', label: 'پروژه‌ها', icon: FolderKanban },
  { to: '/customers', label: 'مشتری‌ها', icon: Users },
  { to: '/activities/today', label: 'فعالیت امروز', icon: ClipboardList },
  { to: '/finance', label: 'مالی', icon: WalletCards },
  { to: '/reports', label: 'گزارش‌ها', icon: BarChart3 },
] as const

export function RootLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isActive = (to: string) => to === '/' ? pathname === '/' : pathname.startsWith(to)
  const primaryMobile = navigation.slice(0, 3)

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <aside className="fixed inset-y-0 right-0 z-30 hidden w-64 border-l border-slate-200 bg-white p-4 lg:flex lg:flex-col">
      <Brand />
      <nav className="mt-8 space-y-1">{navigation.map((item) => <NavLink key={item.to} {...item} active={isActive(item.to)} />)}</nav>
      <p className="mt-auto rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">داده‌ها فقط روی همین دستگاه ذخیره می‌شوند.</p>
    </aside>
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:mr-64"><div className="mx-auto flex max-w-6xl items-center justify-between"><div className="lg:hidden"><Brand compact /></div><p className="hidden text-sm text-slate-500 sm:block">مدیریت پروژه و خدمات فنی</p><button onClick={() => setMobileMenuOpen(true)} aria-label="باز کردن منو" className="rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden"><Menu size={20} /></button></div></header>
    {mobileMenuOpen && <div className="fixed inset-0 z-50 bg-slate-950/30 lg:hidden" onClick={() => setMobileMenuOpen(false)}><aside className="absolute inset-y-0 right-0 w-72 bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><Brand compact /><button onClick={() => setMobileMenuOpen(false)} aria-label="بستن منو" className="rounded-lg p-2"><X size={20} /></button></div><nav className="mt-7 space-y-1">{navigation.map((item) => <NavLink key={item.to} {...item} active={isActive(item.to)} onClick={() => setMobileMenuOpen(false)} />)}</nav></aside></div>}
    <main className="mx-auto max-w-6xl px-4 py-6 pb-24 lg:mr-64 lg:px-8 lg:pb-8"><Outlet /></main>
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur lg:hidden">{primaryMobile.map((item) => <MobileLink key={item.to} {...item} active={isActive(item.to)} />)}<button onClick={() => setMobileMenuOpen(true)} className="flex min-h-14 flex-col items-center justify-center gap-1 text-xs text-slate-500"><MoreHorizontal size={21} /><span>بیشتر</span></button></nav>
  </div>
}

function Brand({ compact = false }: { compact?: boolean }) { return <Link to="/" className="flex items-center gap-2 font-bold text-slate-900"><span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-sm text-white">م</span>{!compact && <span>مدیریت خدمات</span>}</Link> }
function NavLink({ to, label, icon: Icon, active, onClick }: { to: string; label: string; icon: typeof Home; active: boolean; onClick?: () => void }) { return <Link to={to} onClick={onClick} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${active ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Icon size={19} /><span>{label}</span></Link> }
function MobileLink({ to, label, icon: Icon, active }: { to: string; label: string; icon: typeof Home; active: boolean }) { return <Link to={to} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${active ? 'font-semibold text-indigo-700' : 'text-slate-500'}`}><Icon size={20} /><span>{label}</span></Link> }
