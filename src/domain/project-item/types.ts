import type { ID, Timestamp, Money, Unit, PricingType } from '@/types'

export interface ProjectItem {
  id: ID
  projectId: ID
  serviceId?: ID          // اگر از کاتالوگ سرویس انتخاب شده باشد
  date?: string
  title: string           // عنوان کار (مثلاً: نصب نور خطی)
  unit: Unit
  quantity: number        // مقدار کل (مثلاً ۲۵ متر)
  unitPrice: Money        // قیمت واحد (تومان - عدد صحیح)
  totalPrice: Money       // quantity × unitPrice
  pricingType: PricingType
  description?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type CreateProjectItemInput = Omit<ProjectItem, 'id' | 'createdAt' | 'updatedAt' | 'totalPrice'>
export type UpdateProjectItemInput = Partial<CreateProjectItemInput>
