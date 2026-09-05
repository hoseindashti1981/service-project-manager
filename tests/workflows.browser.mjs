import { mkdirSync } from 'node:fs'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const playwright = process.env.SPM_PLAYWRIGHT_PATH ? await import(pathToFileURL(process.env.SPM_PLAYWRIGHT_PATH).href) : await import('playwright')
const browser = await playwright.chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tehran' })
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('dialog', dialog => dialog.accept(dialog.type() === 'prompt' ? 'اصلاح داده آزمایشی' : undefined))
const base = process.env.SPM_TEST_URL || 'http://127.0.0.1:5173'
async function go(path) { await page.goto(base + path); await page.locator('main').waitFor() }
async function eventually(check) {
 for(let i = 0; i < 40; i++) { if(await check()) return; await new Promise(resolve => setTimeout(resolve, 100)) }
 throw new Error('Timed out waiting for assertion')
}
async function setDate(label, year, month, day) {
 await page.getByRole('combobox', { name: `${label}: روز`, exact: true }).selectOption('1')
 await page.getByRole('combobox', { name: `${label}: سال`, exact: true }).selectOption(String(year))
 await page.getByRole('combobox', { name: `${label}: ماه`, exact: true }).selectOption(String(month))
 await page.getByRole('combobox', { name: `${label}: روز`, exact: true }).selectOption(String(day))
}
try {
 await go('/')
 const fixture = await page.evaluate(async () => {
  const { customerRepository } = await import('/src/db/repositories/customer-repository.ts')
  const { projectRepository } = await import('/src/db/repositories/project-repository.ts')
  const { projectItemRepository } = await import('/src/db/repositories/project-item-repository.ts')
  const customer = await customerRepository.create({ name: 'مشتری آزمون', mobile: '09123456789', date: '2025-03-20' })
  const projects = []
  for(const status of ['draft','in_progress','in_progress','planned']) projects.push(await projectRepository.create({ title: `پروژه ${status}`, customerId: customer.id, status, startDate: '2025-03-20', agreementDate: status !== 'draft' ? '2025-03-20' : undefined, executionStartDate: status === 'in_progress' ? '2025-03-20' : undefined }))
  const item = await projectItemRepository.create({ projectId: projects[2].id, title: 'نور خطی آزمایشی', unit: 'meter', quantity: 10, unitPrice: 100, pricingType: 'PER_METER' })
  return { customer, projects, item }
 })
 const invalidLinks = await page.evaluate(async ({ projects, item }) => {
  const { activityRepository } = await import('/src/db/repositories/activity-repository.ts')
  const input = { projectId: projects[2].id, projectItemId: item.id, unit: 'meter', quantity: 1, date: '2025-03-20', title: 'invalid test' }
  const results = []
  for (const update of [{ projectId: projects[0].id }, { unit: 'piece' }, { quantity: -1 }, { date: '2025-02-30' }]) {
   try { await activityRepository.create({ ...input, ...update }); results.push(false) } catch { results.push(true) }
  }
  return results
 }, fixture)
 assert.deepEqual(invalidLinks, [true, true, true, true])
 console.log('Created isolated fixtures; invalid project/service links and dates rejected')
 await go('/projects/new')
 await page.getByPlaceholder('مثال: پروژه مهرویلا').fill('پروژه با تاریخ گذشته')
 await setDate('تاریخ پروژه', 1403, 12, 30)
 await page.getByRole('button', { name: 'ذخیره پروژه', exact: true }).click()
 await page.waitForURL('**/projects')
 const savedProject = await page.evaluate(async () => (await (await import('/src/db/db.ts')).db.projects.toArray()).find(p => p.title === 'پروژه با تاریخ گذشته'))
 assert.equal(savedProject.startDate, '2025-03-20')
 await go(`/projects/${savedProject.id}`)
 assert.equal(await page.getByRole('combobox', { name: 'تاریخ پروژه: روز', exact: true }).inputValue(), '30')
 console.log('Backdated project persists and reloads correctly')
 await go('/activities/today')
 await page.getByLabel('پروژه و مشتری', { exact: true }).selectOption(fixture.projects[2].id)
 assert.match(await page.getByLabel('پروژه و مشتری', { exact: true }).locator('option:checked').innerText(), /مشتری آزمون/)
 await page.getByLabel('خدمت پروژه', { exact: true }).selectOption(fixture.item.id)
 await setDate('تاریخ فعالیت', 1403, 12, 30)
 await page.getByLabel(/مقدار انجام‌شده/).fill('۲٫۵')
 await page.getByRole('button', { name: 'ثبت فعالیت', exact: true }).click()
 await page.getByRole('status').waitFor()
 assert.match(await page.locator('main').innerText(), /باقی‌مانده: ۷٫۵/)
 let stored = await page.evaluate(async () => (await (await import('/src/db/db.ts')).db.projectActivities.toArray())[0])
 assert.equal(stored.date, '2025-03-20'); assert.equal(stored.quantity, 2.5); assert.equal(stored.projectItemId, fixture.item.id); assert.equal(stored.unit, 'meter')
 await page.getByRole('button', { name: 'ویرایش', exact: true }).click()
 await page.getByLabel('دلیل اصلاح یا ثبت دیرهنگام', { exact: true }).fill('اصلاح مقدار آزمون')
 await page.getByLabel(/مقدار انجام‌شده/).fill('۴')
 await page.getByRole('button', { name: 'ذخیره تغییرات', exact: true }).click()
 await eventually(async () => /باقی‌مانده: ۶/.test(await page.locator('main').innerText()))
 await page.reload()
 await page.getByLabel('پروژه و مشتری', { exact: true }).selectOption(fixture.projects[2].id)
 await page.getByLabel('نمایش همه تاریخ‌ها').check()
 await eventually(async () => /باقی‌مانده: ۶/.test(await page.locator('main').innerText()))
 await go(`/projects/${fixture.projects[2].id}`)
 await eventually(async () => /باقی‌مانده: ۶/.test(await page.locator('main').innerText()))
 const guard = await page.evaluate(async (itemId) => { try { await (await import('/src/db/repositories/project-item-repository.ts')).projectItemRepository.delete(itemId); return false } catch { return true } }, fixture.item.id)
 assert.equal(guard, true)
 await go('/activities/today')
 await page.getByLabel('پروژه و مشتری', { exact: true }).selectOption(fixture.projects[2].id)
 await page.getByLabel('نمایش همه تاریخ‌ها').check()
 await page.getByRole('button', { name: 'حذف', exact: true }).click()
 await eventually(async () => /باقی‌مانده: ۱۰/.test(await page.locator('main').innerText()))
 console.log('Linked activity create/edit/delete, historical totals, reload, and deletion guard pass')
 await go('/reminders')
 assert.match(await page.locator('form select').last().innerText(), /پروژه in_progress — مشتری آزمون/)
 await go('/finance')
 for (const [button, table] of [['پیش‌فاکتور','quotations'], ['فاکتور','invoices'], ['پرداخت','payments']]) {
  await page.getByRole('button', { name: button, exact: true }).click()
  await page.locator('select[name="customerId"]').selectOption(fixture.customer.id)
  await setDate('تاریخ سند', 1403, 12, 30)
  if (table === 'payments') await page.locator('input[name="amount"]').fill('100')
  else { await page.locator('input[name="description"]').fill('خدمت آزمایشی'); await page.locator('input[name="unitPrice"]').fill('100') }
  await page.getByRole('button', { name: 'ذخیره', exact: true }).click()
  await page.locator('form').waitFor({ state: 'hidden' })
  assert.equal(await page.evaluate(async (table) => (await (await import('/src/db/db.ts')).db.table(table).toArray())[0].date, table), '2025-03-20')
 }
 assert.equal(await page.locator('input[type="date"]').count(), 0)
 console.log('All three financial forms save the selected Persian date')
 await go(`/projects/${fixture.projects[2].id}`)
 for (const [button, table] of [['کار اضافه','projectChanges'], ['مصالح','materials'], ['هزینه','expenses']]) {
  await page.getByRole('button', { name: button, exact: true }).click()
  const financial = page.locator('form').filter({ has: page.locator('input[name="title"]') })
  await financial.locator('input[name="title"]').fill(`آزمون ${button}`)
  if(table === 'materials') { await financial.locator('input[name="quantity"]').fill('2'); await financial.locator('input[name="cost"]').fill('100') }
  else await financial.locator('input[name="amount"]').fill('100')
  await setDate('تاریخ', 1403, 12, 30)
  await financial.getByRole('button', { name: 'ذخیره', exact: true }).click()
  await financial.waitFor({ state: 'hidden' })
  assert.equal(await page.evaluate(async (table) => (await (await import('/src/db/db.ts')).db.table(table).toArray())[0].date, table), '2025-03-20')
 }
 await go('/services')
 await page.getByPlaceholder('مثلاً نصب چراغ').fill('خدمت با تاریخ گذشته')
 await setDate('تاریخ قیمت پایه', 1403, 12, 30)
 await page.getByRole('button', { name: 'افزودن خدمت', exact: true }).click()
 await eventually(async () => await page.getByRole('heading', { name: 'خدمت با تاریخ گذشته', exact: true }).count() > 0)
 assert.equal(await page.evaluate(async () => (await (await import('/src/db/db.ts')).db.services.toArray()).find(item => item.name === 'خدمت با تاریخ گذشته').date), '2025-03-20')
 console.log('Project expenses, materials, extra work and catalog dates persist')
 const catalogFixture = await page.evaluate(async () => {
  const { serviceRepository } = await import('/src/db/repositories/service-repository.ts')
  const service = await serviceRepository.create({ name: 'خدمت مستقیم کاتالوگ', defaultUnit: 'meter', defaultUnitPrice: 500, isActive: true })
  await serviceRepository.create({ name: 'خدمت غیرفعال آزمون', defaultUnit: 'meter', defaultUnitPrice: 0, isActive: false })
  return service
 })
 await go('/activities/today')
 await page.getByLabel('پروژه و مشتری', { exact: true }).selectOption(fixture.projects[0].id)
 const serviceSelect = page.getByLabel('خدمت پروژه', { exact: true })
 await page.getByLabel('شروع اجرای پروژه با تاریخ این فعالیت و ثبت فعالیت').check()
 await serviceSelect.selectOption(`catalog:${catalogFixture.id}`)
 assert.ok(!(await serviceSelect.innerText()).includes('خدمت غیرفعال آزمون'))
 await page.getByLabel('مقدار کل خدمت در پروژه', { exact: true }).fill('۱۰')
 await page.getByLabel(/مقدار انجام‌شده/).fill('۲٫۵')
 await page.getByRole('button', { name: 'ثبت فعالیت', exact: true }).click()
 await page.getByRole('status').waitFor()
 const attached = await page.evaluate(async ({ projectId, serviceId }) => (await (await import('/src/db/db.ts')).db.projectItems.toArray()).filter(row => row.projectId === projectId && row.serviceId === serviceId), { projectId: fixture.projects[0].id, serviceId: catalogFixture.id })
 assert.equal(attached.length, 1); assert.equal(attached[0].quantity, 10); assert.equal(attached[0].unitPrice, 500)
 await serviceSelect.selectOption(attached[0].id)
 await page.getByLabel(/مقدار انجام‌شده/).fill('۱')
 await page.getByRole('button', { name: 'ثبت فعالیت', exact: true }).click()
 await eventually(async () => /باقی‌مانده: ۶٫۵/.test(await page.locator('main').innerText()))
 const result = await page.evaluate(async ({ projectId, serviceId }) => {
  const { db } = await import('/src/db/db.ts')
  const { saveCatalogActivity } = await import('/src/db/repositories/catalog-activity.ts')
  const before = await db.projectItems.count()
  let rejected = false
  try { await saveCatalogActivity({ projectId, title: '', date: '2025-03-20', quantity: 1 }, serviceId, 10) } catch { rejected = true }
  return { rejected, before, after: await db.projectItems.count() }
 }, { projectId: fixture.projects[1].id, serviceId: catalogFixture.id })
 assert.equal(result.rejected, true); assert.equal(result.before, result.after)
 console.log('Quick-add lists catalog services, attaches once with base price, preserves progress, and rolls back failed saves')

 await go('/')
 for (const [status, label] of [['draft','پیش‌نویس'], ['planned','برنامه‌ریزی‌شده'], ['in_progress','در جریان'], ['paused','متوقف'], ['completed','تکمیل‌شده']]) {
  const expected = await page.evaluate(async (status) => (await (await import('/src/db/db.ts')).db.projects.toArray()).filter(project => project.status === status).map(project => project.title), status)
  await page.getByRole('link', { name: new RegExp(`پروژه‌های ${label}`) }).click()
  await page.waitForURL(`**/projects?status=${status}`)
  if (expected.length) await page.locator('main a[href^="/projects/"]').filter({ hasText: expected[0] }).first().waitFor()
  const names = await page.locator('main a[href^="/projects/"]').allTextContents()
  for (const title of expected) assert.ok(names.some(text => text.includes(title)))
  await go('/')
 }
 await page.locator(`a[href="/projects/${fixture.projects[3].id}"]`).waitFor()
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
 mkdirSync('test-results', { recursive: true })
 await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true })
 assert.deepEqual(errors, [])
 console.log('Five dashboard links, individual project cards, mobile overflow, and console checks pass')
} finally { await browser.close() }
