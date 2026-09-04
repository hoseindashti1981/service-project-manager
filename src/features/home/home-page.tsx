export function HomePage() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800">
        داشبورد
      </h2>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <p className="text-slate-600 leading-7">
          خوش آمدید.
          <br />
          پروژه با موفقیت راه‌اندازی شد.
          <br />
          در مراحل بعدی قابلیت‌های واقعی را اضافه می‌کنیم.
        </p>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <p className="text-emerald-800 text-sm">
          وضعیت: Phase 0 در حال تکمیل است
        </p>
      </div>
    </div>
  )
}