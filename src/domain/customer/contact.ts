import { normalizeDigits } from '@/domain/service/helpers'

export const phoneNumber = (value: string) => normalizeDigits(value).replace(/[^+0-9]/g, '')
export const customerSearchText = (value: string) => normalizeDigits(value.toLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک')).replace(/[-()‌]/g,'')
