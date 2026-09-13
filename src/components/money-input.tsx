import {useEffect, useLayoutEffect, useRef, useState, type InputHTMLAttributes} from 'react'
import {normalizeDigits} from '@/domain/service/helpers'

type Props = InputHTMLAttributes<HTMLInputElement>
export function MoneyInput({value, defaultValue, onChange, name, type: _type, min = 0, max, ...props}: Props) {
  const [local, setLocal] = useState(String(defaultValue ?? ''))
  const [, refresh] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)
  const raw = normalizeDigits(String(value ?? local))
  const display = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '٬')
  useLayoutEffect(() => {
    const element = input.current
    if (!element) return
    const number = Number(raw)
    element.setCustomValidity(raw && (!Number.isSafeInteger(number) || number < Number(min) || (max !== undefined && number > Number(max))) ? 'مبلغ صحیح و معتبر به تومان وارد کنید.' : '')
    if (caret.current !== null && document.activeElement === element) {
      let position = 0, digits = 0
      while (position < display.length && digits < caret.current) {if (/\d/.test(display[position])) digits++; position++}
      element.setSelectionRange(position, position)
      caret.current = null
    }
  })
  useEffect(() => {
    const form = input.current?.form
    const reset = () => setLocal(String(defaultValue ?? ''))
    form?.addEventListener('reset', reset)
    return () => form?.removeEventListener('reset', reset)
  }, [defaultValue])
  return <><input {...props} ref={input} type="text" inputMode="numeric" dir="ltr" value={display} onChange={event => {
    const element = event.currentTarget
    const next = normalizeDigits(element.value)
    if (!/^\d*$/.test(next)) {element.value = display; return}
    caret.current = normalizeDigits(element.value.slice(0, element.selectionStart ?? element.value.length)).length
    setLocal(next)
    refresh(previous => previous + 1)
    element.value = next
    onChange?.(event)
  }}/>{name && <input type="hidden" name={name} value={raw} disabled={props.disabled}/>}</>
}
