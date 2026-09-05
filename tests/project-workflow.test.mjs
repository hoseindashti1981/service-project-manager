import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
function moduleUrl(path, imports = {}) {
 const source = readFileSync(new URL(path, import.meta.url), 'utf8')
 let { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
 for (const [key, url] of Object.entries(imports)) outputText = outputText.replaceAll(`'${key}'`, `'${url}'`)
 return `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
}
const dates = moduleUrl('../src/lib/dates.ts')
const { validateExecutionEntry, executionAllowedOn, validateProjectDates, validateWorkflowChronology } = await import(moduleUrl('../src/domain/project/workflow.ts', { '@/lib/dates': dates }))
const { transitions, needsTransitionReason, dashboardStatuses, executionDeadlineStatuses } = await import(moduleUrl('../src/domain/project/status.ts'))
const event = (from, to, effectiveDate) => ({ kind: 'status', from, to, effectiveDate })
const project = { id: 'p', status: 'completed', executionStartDate: '2025-01-01', actualEndDate: '2025-01-20', statusHistory: [event(null, 'in_progress', '2025-01-01'), event('in_progress', 'paused', '2025-01-05'), event('paused', 'in_progress', '2025-01-10'), event('in_progress', 'completed', '2025-01-20')] }
test('seven current statuses, guarded reopening, legacy review and consistent deadlines', () => {
 assert.deepEqual(dashboardStatuses, ['draft','planned','in_progress','paused','completed'])
 assert.ok(!executionDeadlineStatuses.includes('cancelled'))
 assert.ok(!executionDeadlineStatuses.includes('delivered'))
 assert.ok(!transitions.draft.includes('delivered'))
 assert.deepEqual(transitions.active, ['draft','planned','in_progress'])
 assert.equal(needsTransitionReason('completed', 'in_progress'), true)
 assert.equal(needsTransitionReason('in_progress', 'paused'), true)
})
test('historical entries require an execution period and reason; paused gaps are excluded', () => {
 assert.equal(executionAllowedOn(project, '2025-01-03'), true)
 assert.equal(executionAllowedOn(project, '2025-01-07'), false)
 assert.equal(executionAllowedOn(project, '2025-01-21'), false)
 assert.doesNotThrow(() => validateExecutionEntry(project, '2025-01-03', true, 'ثبت دیرهنگام'))
 assert.throws(() => validateExecutionEntry(project, '2025-01-03', false, 'توضیح'))
 assert.throws(() => validateExecutionEntry(project, '2025-01-03', true, ''))
 assert.throws(() => validateExecutionEntry(project, '2025-01-07', true, 'توضیح'))
 assert.throws(() => validateExecutionEntry({ ...project, status: 'active' }, '2025-01-03', true, 'توضیح'))
})
test('closed-project correction can preserve an old date without allowing new execution', () => {
 assert.doesNotThrow(() => validateExecutionEntry(project, '2024-01-01', false, 'اصلاح سابقه قدیمی', '2024-01-01'))
 assert.throws(() => validateExecutionEntry(project, '2024-01-01', false, '', '2024-01-01'))
 assert.throws(() => validateExecutionEntry(project, '2099-01-01', true, 'توضیح'))
})
test('actual dates and their corrections respect milestone and transition order', () => {
 assert.throws(() => validateProjectDates({ status: 'in_progress' }, true))
 assert.throws(() => validateProjectDates({ status: 'planned' }, true))
 assert.throws(() => validateProjectDates({ executionStartDate: '2025-01-10', actualEndDate: '2025-01-09' }))
 assert.throws(() => validateProjectDates({ deliveryDate: '2099-01-01' }))
 assert.equal(executionAllowedOn({ ...project, executionStartDate: '2024-12-31' }, '2024-12-31'), true)
 assert.throws(() => validateWorkflowChronology({ ...project, executionStartDate: '2025-01-06' }))
})
