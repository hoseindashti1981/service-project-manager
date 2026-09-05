import { useMemo } from 'react'

const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
const digitToLatin = (value: string) => value.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))

type JalaliDate = { year: number; month: number; day: number }

function isoToJalali(value: string): JalaliDate {
  const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(`${value}T12:00:00`))
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(digitToLatin(parts.find((item) => item.type === type)?.value ?? '0'))
  return { year: part('year'), month: part('month'), day: part('day') }
}

function jalaliToIso({ year, month, day }: JalaliDate) {
  let jy = year + 1595
  let days = -355668 + (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4) + day + (month < 7 ? (month - 1) * 31 : ((month - 7) * 30) + 186)
  let gy = 400 * Math.floor(days / 146097)
  days %= 146097
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524)
    days %= 36524
    if (days >= 365) days++
  }
  gy += 4 * Math.floor(days / 1461)
  days %= 1461
  if (days > 365) { gy += Math.floor((days - 1) / 365); days = (days - 1) % 365 }
  let gd = days + 1
  const gregorianMonthDays = [31, ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let gm = 0
  while (gd > gregorianMonthDays[gm]) gd -= gregorianMonthDays[gm++]
  return `${gy}-${String(gm + 1).padStart(2, '0')}-${String(gd).padStart(2, '0')}`
}

function daysInMonth(month: number) { return month <= 6 ? 31 : month <= 11 ? 30 : 29 }

export function JalaliDatePicker({ value, onChange }: { value: string; onChange: (isoDate: string) => void }) {
  const selected = useMemo(() => isoToJalali(value), [value])
  const years = Array.from({ length: 16 }, (_, index) => selected.year - 5 + index)
  const update = (next: Partial<JalaliDate>) => {
    const date = { ...selected, ...next }
    date.day = Math.min(date.day, daysInMonth(date.month))
    onChange(jalaliToIso(date))
  }
  return <div className="grid grid-cols-3 gap-2"><select aria-label="روز" value={selected.day} onChange={(event) => update({ day: Number(event.target.value) })} className="rounded-xl border border-slate-300 bg-white px-2 py-2.5 text-center outline-none focus:border-indigo-500">{Array.from({ length: daysInMonth(selected.month) }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day.toLocaleString('fa-IR')}</option>)}</select><select aria-label="ماه" value={selected.month} onChange={(event) => update({ month: Number(event.target.value) })} className="rounded-xl border border-slate-300 bg-white px-2 py-2.5 outline-none focus:border-indigo-500">{months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select><select aria-label="سال" value={selected.year} onChange={(event) => update({ year: Number(event.target.value) })} className="rounded-xl border border-slate-300 bg-white px-2 py-2.5 text-center outline-none focus:border-indigo-500">{years.map((year) => <option key={year} value={year}>{year.toLocaleString('fa-IR')}</option>)}</select></div>
}
