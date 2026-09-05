import { useState } from 'react'
import { isoToJalali, jalaliToIso, jalaliMonthDays, toISODate } from '@/lib/dates'

const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
export function JalaliDatePicker({ value, onChange, name, label = 'تاریخ', disabled = false }: { value: string; onChange: (isoDate: string) => void; name?: string; label?: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const selected = isoToJalali(value || toISODate())
  const years = Array.from({ length: 101 }, (_, index) => selected.year - 50 + index)
  const count = jalaliMonthDays(selected.year, selected.month)
  const offset = (new Date(`${jalaliToIso({ ...selected, day: 1 })}T12:00:00`).getDay() + 1) % 7
  const update = (next: Partial<typeof selected>) => {
    const date = { ...selected, ...next }
    date.day = Math.min(date.day, jalaliMonthDays(date.year, date.month))
    onChange(jalaliToIso(date))
  }
  const field = 'min-w-0 rounded-xl border border-slate-300 bg-white px-2 py-2.5 text-center outline-none focus:border-indigo-500'
  return <div role="group" aria-label={label} className="space-y-2">
    {name && <input type="hidden" name={name} value={value} />}
    <div className="grid grid-cols-3 gap-2">
      <select disabled={disabled} aria-label={`${label}: روز`} value={selected.day} onChange={(event) => update({ day: Number(event.target.value) })} className={field}>{Array.from({ length: count }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day.toLocaleString('fa-IR')}</option>)}</select>
      <select disabled={disabled} aria-label={`${label}: ماه`} value={selected.month} onChange={(event) => update({ month: Number(event.target.value) })} className={field}>{months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select>
      <select disabled={disabled} aria-label={`${label}: سال`} value={selected.year} onChange={(event) => update({ year: Number(event.target.value) })} className={field}>{years.map((year) => <option key={year} value={year}>{year.toLocaleString('fa-IR', { useGrouping: false })}</option>)}</select>
    </div>
    <button disabled={disabled} type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="text-xs text-indigo-600">{open ? 'بستن تقویم' : 'انتخاب از تقویم'}</button>
    {open && <div className="rounded-xl border bg-white p-3"><div className="mb-3 flex justify-between"><button disabled={disabled} type="button" aria-label={`${label}: ماه قبل`} onClick={() => update(selected.month === 1 ? { year: selected.year - 1, month: 12 } : { month: selected.month - 1 })}>ماه قبل</button><b>{months[selected.month - 1]}</b><button disabled={disabled} type="button" aria-label={`${label}: ماه بعد`} onClick={() => update(selected.month === 12 ? { year: selected.year + 1, month: 1 } : { month: selected.month + 1 })}>ماه بعد</button></div><div className="grid grid-cols-7 gap-1 text-center text-sm">{['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((day) => <span key={day}>{day}</span>)}{Array.from({ length: offset }, (_, i) => <span key={`empty-${i}`} />)}{Array.from({ length: count }, (_, i) => i + 1).map((day) => <button disabled={disabled} type="button" aria-label={`${day} ${months[selected.month - 1]} ${selected.year}`} aria-pressed={selected.day === day} key={day} onClick={() => { update({ day }); setOpen(false) }} className={`min-h-9 rounded-lg ${selected.day === day ? 'bg-indigo-600 text-white' : 'hover:bg-indigo-50'}`}>{day.toLocaleString('fa-IR')}</button>)}</div></div>}
  </div>
}
