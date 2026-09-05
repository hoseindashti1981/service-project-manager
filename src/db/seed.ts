import { serviceRepository } from '@/db/repositories/service-repository'
import type { Unit } from '@/types'

const defaultServices: { name: string; defaultUnit: Unit }[] = [
  { name: 'نصب نور خطی', defaultUnit: 'meter' },
  { name: 'نصب چراغ', defaultUnit: 'piece' },
  { name: 'نصب هالوژن', defaultUnit: 'piece' },
  { name: 'نصب چراغ مگنتی', defaultUnit: 'piece' },
  { name: 'نصب کلید و پریز', defaultUnit: 'piece' },
  { name: 'سیم‌کشی', defaultUnit: 'meter' },
  { name: 'شیارزنی کناف', defaultUnit: 'meter' },
  { name: 'برش سقف', defaultUnit: 'meter' },
  { name: 'سیستم صوتی', defaultUnit: 'project' },
  { name: 'سیستم هوشمند', defaultUnit: 'project' },
  { name: 'ایاب‌وذهاب', defaultUnit: 'fixed' },
  { name: 'حمل‌ونقل', defaultUnit: 'fixed' },
  { name: 'سایر', defaultUnit: 'service' },
]

export async function seedDefaultServices() {
  const existing = await serviceRepository.getAll()

  // اگر از قبل سرویسی وجود داشت، دوباره نساز
  if (existing.length > 0) return

  for (const item of defaultServices) {
    await serviceRepository.create({
      name: item.name,
      defaultUnit: item.defaultUnit,
      defaultUnitPrice: 0,
      isActive: true,
    })
  }

  console.log('سرویس‌های پیش‌فرض با موفقیت اضافه شدند')
}
