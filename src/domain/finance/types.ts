import type { ID, Money, Timestamp } from '@/types'

export interface FinanceLine {
  id: ID
  description: string
  quantity: number
  unitPrice: Money
  total: Money
  unit?: string
}

export interface DocumentOptions { discount?:number; tax?:number; extraFee?:number; dueDate?:string; terms?:string; business?:{name:string;phone:string;address:string;logo?:string;color?:string}; customerSnapshot?:{name:string;mobile:string;address?:string}; projectSnapshot?:string;projectAddress?:string; paymentInfo?:string; qrData?:string }

export interface Quotation extends DocumentOptions {
  id: ID
  number: string
  customerId: ID
  projectId?: ID
  date: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  lines: FinanceLine[]
  total: Money
  note?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Invoice extends DocumentOptions {
  id: ID
  number: string
  customerId: ID
  projectId?: ID
  quotationId?: ID
  date: string
  status: 'draft' | 'issued' | 'paid' | 'void'
  lines: FinanceLine[]
  total: Money
  note?: string
  voidReason?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Payment {
  id: ID
  customerId: ID
  projectId?: ID
  invoiceId?: ID
  amount: Money
  date: string
  method: 'cash' | 'card' | 'transfer' | 'cheque' | 'other'
  note?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type CreateQuotationInput = Omit<Quotation, 'id' | 'number' | 'createdAt' | 'updatedAt' | 'total' | 'status'> & { status: Quotation['status'] | Invoice['status'] }
export type CreateInvoiceInput = Omit<Invoice, 'id' | 'number' | 'createdAt' | 'updatedAt' | 'total' | 'status'> & { status: Quotation['status'] | Invoice['status'] }
export type CreatePaymentInput = Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>
