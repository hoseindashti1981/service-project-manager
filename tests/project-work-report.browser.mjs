import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const playwrightPath = process.env.SPM_PLAYWRIGHT_PATH
if (!playwrightPath) throw new Error('SPM_PLAYWRIGHT_PATH is required')
const { chromium } = await import(pathToFileURL(playwrightPath).href)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran' })
const base = process.env.SPM_TEST_URL || 'http://127.0.0.1:5173'
const errors = []
page.on('pageerror', (error) => errors.push(error.message))

try {
  await page.goto(base)
  await page.locator('main').waitFor()
  await page.evaluate(async () => {
    const { db } = await import('/src/db/db.ts')
    await db.transaction('rw', db.tables, async () => { for (const table of db.tables) await table.clear() })
    const now = Date.now()
    await db.customers.add({ id: 'report-customer', name: 'مشتری گزارش', mobile: '09120000000', createdAt: now, updatedAt: now })
    await db.projects.add({ id: 'report-project', customerId: 'report-customer', title: 'پروژه گزارش', status: 'in_progress', executionStartDate: '2026-11-01', contractAmount: 5000, createdAt: now, updatedAt: now })
    await db.projectActivities.bulkAdd([
      { id: 'report-a1', projectId: 'report-project', date: '2026-11-02', title: 'نصب اولیه', quantity: 5, unit: 'متر', note: 'سمت ورودی', createdAt: now, updatedAt: now },
      { id: 'report-a2', projectId: 'report-project', date: '2026-11-02', title: 'تکمیل نصب', createdAt: now + 1, updatedAt: now + 1 },
      { id: 'report-a3', projectId: 'report-project', date: '2026-11-04', title: 'تست نهایی', amount: 1000, createdAt: now + 2, updatedAt: now + 2 },
    ])
    await db.invoices.add({ id: 'report-invoice', number: 'INV-R', customerId: 'report-customer', projectId: 'report-project', date: '2026-11-05', status: 'issued', lines: [{ id: 'l', description: 'کار پروژه', quantity: 1, unitPrice: 4000, total: 4000 }], total: 4000, createdAt: now, updatedAt: now })
    await db.payments.add({ id: 'report-payment', customerId: 'report-customer', projectId: 'report-project', invoiceId: 'report-invoice', amount: 1500, date: '2026-11-06', method: 'cash', createdAt: now, updatedAt: now })
  })

  await page.goto(base + '/reports/project-work')
  await page.getByRole('heading', { name: 'گزارش کار پروژه', exact: true }).waitFor()
  await page.getByLabel('مشتری گزارش').selectOption('report-customer')
  await page.getByLabel('پروژه گزارش', { exact: true }).selectOption('report-project')
  assert.equal(await page.getByLabel('مشتری گزارش').inputValue(), 'report-customer')
  assert.equal(await page.getByLabel('پروژه گزارش', { exact: true }).inputValue(), 'report-project')
  const summary = page.getByRole('region', { name: 'خلاصه گزارش پروژه' })
  assert.match(await summary.innerText(), /۲ روز/)
  assert.match(await summary.innerText(), /۳ فعالیت/)
  assert.match(await summary.innerText(), /۱٬۵۰۰ تومان/)
  assert.match(await summary.innerText(), /۲٬۵۰۰ تومان/)
  const days = page.getByRole('region', { name: 'روزهای کاری پروژه' })
  assert.equal(await days.getByRole('button').count(), 2)
  await days.getByRole('button').filter({ hasText: '۲ فعالیت' }).click()
  const details = page.getByRole('region', { name: /فعالیت‌های/ })
  await details.getByText('نصب اولیه', { exact: true }).waitFor()
  await details.getByText('تکمیل نصب', { exact: true }).waitFor()
  await details.getByRole('button', { name: /بازگشت به روزهای پروژه/ }).click()
  assert.equal(await page.getByRole('region', { name: 'روزهای کاری پروژه' }).getByRole('button').count(), 2)
  await page.goto(base + '/projects/report-project')
  const shortcut = page.getByRole('link', { name: /گزارش کار این پروژه/ })
  await shortcut.waitFor()
  assert.match(await shortcut.getAttribute('href'), /customerId=report-customer/)
  assert.match(await shortcut.getAttribute('href'), /projectId=report-project/)
  await shortcut.click()
  await page.getByRole('heading', { name: 'گزارش کار پروژه', exact: true }).waitFor()
  await page.waitForFunction(() => document.querySelector('select[aria-label="پروژه گزارش"]')?.value === 'report-project')
  assert.equal(await page.getByLabel('مشتری گزارش').inputValue(), 'report-customer')
  assert.equal(errors.length, 0, errors.join('\n'))
  console.log('Project work report groups activity days, drills into one day, preserves navigation and uses project accounting totals.')
} finally {
  await browser.close()
}
