// انواع مشترک کل پروژه

export type ID = string

/** زمان به صورت میلی‌ثانیه (Date.now()) */
export type Timestamp = number

/** پول همیشه عدد صحیح به تومان (بدون اعشار و بدون float) */
export type Money = number

/** واحدهای اندازه‌گیری */
export type Unit =
  | 'meter'
  | 'piece'
  | 'point'
  | 'hour'
  | 'day'
  | 'device'
  | 'project'
  | 'service'
  | 'fixed'

/** نوع قیمت‌گذاری */
export type PricingType =
  | 'PER_UNIT'
  | 'PER_METER'
  | 'PER_POINT'
  | 'PER_HOUR'
  | 'PER_DAY'
  | 'FIXED'
  | 'CUSTOM'