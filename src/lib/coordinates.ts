import {normalizeDigits} from '@/domain/service/helpers'

export function parseCoordinates(value: string) {
  const parts = value.trim().split(/\s*[,،;؛]\s*|\s+/).map(p => normalizeDigits(p).replace(/−/g, '-'))
  const numbers = parts.map(Number)
  if (parts.length !== 2 || parts.some(p => !/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(p)) || numbers.some(n => !Number.isFinite(n)) || Math.abs(numbers[0]) > 90 || Math.abs(numbers[1]) > 180) {
    throw Error('دو عدد به ترتیب عرض، طول وارد کنید؛ مانند 35.689200, 51.389000')
  }
  return {latitude: numbers[0], longitude: numbers[1]}
}
