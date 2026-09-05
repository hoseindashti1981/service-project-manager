import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
async function load(relative) {
 const source = readFileSync(new URL(relative, import.meta.url), 'utf8')
 const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
 return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}
const { isoToJalali, jalaliToIso, jalaliMonthDays, toISODate, requireDate } = await load('../src/lib/dates.ts')
const { serviceProgress } = await load('../src/domain/activity/progress.ts')
test('Persian leap-day and Nowruz round-trip with the same calendar', () => {
 assert.equal(jalaliToIso({ year: 1403, month: 12, day: 30 }), '2025-03-20')
 assert.deepEqual(isoToJalali('2025-03-21'), { year: 1404, month: 1, day: 1 })
 assert.equal(jalaliMonthDays(1403, 12), 30)
 assert.equal(jalaliMonthDays(1404, 12), 29)
 assert.throws(() => jalaliToIso({ year: 1404, month: 12, day: 30 }))
 for (const date of ['2000-01-01', '2024-03-20', '2025-03-20', '2026-09-05', '2030-12-31']) assert.equal(jalaliToIso(isoToJalali(date)), date)
})
test('today follows local midnight instead of the UTC date', () => {
 const original = process.env.TZ
 process.env.TZ = 'Asia/Tehran'
 try { assert.equal(toISODate(new Date('2026-09-04T21:00:00Z')), '2026-09-05') }
 finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original }
 assert.throws(() => requireDate('2026-02-30'))
 assert.throws(() => requireDate(''))
})
test('service progress includes past activity and recomputes after edits/removal', () => {
 const item = { id: 'a', projectId: 'p', unit: 'meter', quantity: 10 }
 const activity = { projectItemId: 'a', projectId: 'p', unit: 'meter', quantity: 2.5, date: '2020-01-01' }
 const rows = [activity, { ...activity, quantity: 3.5 }, { ...activity, projectId: 'other', quantity: 99 }, { ...activity, unit: 'piece', quantity: 99 }]
 assert.deepEqual(serviceProgress(item, rows), { completed: 6, remaining: 4, extra: 0, percent: 60 })
 assert.equal(serviceProgress(item, [activity]).remaining, 7.5)
 assert.deepEqual(serviceProgress(item, [{ ...activity, quantity: 12 }]), { completed: 12, remaining: 0, extra: 2, percent: 100 })
 assert.equal(serviceProgress(item, []).completed, 0)
})
