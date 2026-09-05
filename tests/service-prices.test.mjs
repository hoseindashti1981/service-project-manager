import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
const source = readFileSync(new URL('../src/domain/service/helpers.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { normalizeDigits, validateServicePrice, serviceUnits } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
test('Persian and Arabic prices and decimal quantities normalize correctly', () => {
  assert.equal(normalizeDigits('۱۲۳٬۴۵۶'), '123456')
  assert.equal(normalizeDigits('١٢٣,٤٥٦'), '123456')
  assert.equal(Number(normalizeDigits('۲٫۵')), 2.5)
  assert.equal(Number(normalizeDigits('-۲۰')), -20)
})
test('prices reject negatives, fractions, non-finite and unsafe values', () => {
  for (const value of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => validateServicePrice(value))
  assert.equal(validateServicePrice(0), 0)
  assert.equal(validateServicePrice(250000), 250000)
})
test('all nine domain units are selectable, including device', () => {
  assert.equal(serviceUnits.length, 9)
  assert.equal(new Set(serviceUnits.map(unit => unit.value)).size, 9)
  assert.ok(serviceUnits.some(unit => unit.value === 'device'))
})
