import { db } from '@/db/db'
import type { CreateInvoiceInput, CreatePaymentInput, CreateQuotationInput, FinanceLine, Invoice, Payment, Quotation } from '@/domain/finance/types'
import type { ID, Money } from '@/types'

const now = () => Date.now()
const totalLines = (lines: FinanceLine[]) => lines.reduce((sum, line) => sum + line.total, 0)

function jalaliYear() {
  const year = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric' }).format(new Date())
  return year.replace(/[^0-9۰-۹]/g, '').replace(/[۰-۹]/g, (char) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(char)))
}

async function nextNumber(type: 'Q' | 'INV') {
  const table = type === 'Q' ? db.quotations : db.invoices
  const prefix = `${type}-${jalaliYear()}-`
  const existing = await table.filter((item) => item.number.startsWith(prefix)).count()
  return `${prefix}${String(existing + 1).padStart(4, '0')}`
}

export const financeRepository = {
  async createQuotation(input: CreateQuotationInput): Promise<Quotation> {
    const timestamp = now()
    const quotation: Quotation = { ...input, status: input.status as Quotation['status'], id: crypto.randomUUID(), number: await nextNumber('Q'), lines: input.lines.map((line) => ({ ...line, id: line.id || crypto.randomUUID(), total: Math.round(line.quantity * line.unitPrice) })), total: totalLines(input.lines.map((line) => ({ ...line, total: Math.round(line.quantity * line.unitPrice) }))), createdAt: timestamp, updatedAt: timestamp }
    await db.quotations.add(quotation)
    return quotation
  },

  async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    const timestamp = now()
    const lines = input.lines.map((line) => ({ ...line, id: line.id || crypto.randomUUID(), total: Math.round(line.quantity * line.unitPrice) }))
    const invoice: Invoice = { ...input, status: input.status as Invoice['status'], id: crypto.randomUUID(), number: await nextNumber('INV'), lines, total: totalLines(lines), createdAt: timestamp, updatedAt: timestamp }
    await db.invoices.add(invoice)
    return invoice
  },

  async voidInvoice(id: ID, reason?: string): Promise<Invoice> {
    const invoice = await db.invoices.get(id)
    if (!invoice) throw new Error('فاکتور یافت نشد')
    const updated: Invoice = { ...invoice, status: 'void', voidReason: reason?.trim() || undefined, updatedAt: now() }
    await db.invoices.put(updated)
    return updated
  },

  async createPayment(input: CreatePaymentInput): Promise<Payment> {
    const payment: Payment = { ...input, id: crypto.randomUUID(), amount: Math.round(input.amount), createdAt: now(), updatedAt: now() }
    await db.payments.add(payment)
    if (payment.invoiceId) {
      const invoice = await db.invoices.get(payment.invoiceId)
      if (invoice && invoice.status !== 'void') {
        const payments = await db.payments.where('invoiceId').equals(invoice.id).toArray()
        const received = payments.reduce((sum, item) => sum + item.amount, 0)
        if (received >= invoice.total) await db.invoices.put({ ...invoice, status: 'paid', updatedAt: now() })
      }
    }
    return payment
  },

  getQuotations: () => db.quotations.orderBy('createdAt').reverse().toArray(),
  getInvoices: () => db.invoices.orderBy('createdAt').reverse().toArray(),
  getPayments: () => db.payments.orderBy('date').reverse().toArray(),

  async balanceForCustomer(customerId: ID): Promise<Money> {
    const [invoices, payments] = await Promise.all([db.invoices.where('customerId').equals(customerId).toArray(), db.payments.where('customerId').equals(customerId).toArray()])
    return invoices.filter((item) => item.status !== 'void').reduce((sum, item) => sum + item.total, 0) - payments.reduce((sum, item) => sum + item.amount, 0)
  },

  async balanceForProject(projectId: ID): Promise<Money> {
    const [invoices, payments] = await Promise.all([db.invoices.where('projectId').equals(projectId).toArray(), db.payments.where('projectId').equals(projectId).toArray()])
    return invoices.filter((item) => item.status !== 'void').reduce((sum, item) => sum + item.total, 0) - payments.reduce((sum, item) => sum + item.amount, 0)
  },
}
