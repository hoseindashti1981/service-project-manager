import {parseCoordinates} from './lib/coordinates'

const field = document.querySelector<HTMLInputElement>('#coordinates')!
const status = document.querySelector<HTMLElement>('#status')!
const accuracy = document.querySelector<HTMLElement>('#accuracy')!
const locate = document.querySelector<HTMLButtonElement>('#locate')!
const copy = document.querySelector<HTMLButtonElement>('#copy')!
const apply = document.querySelector<HTMLButtonElement>('#apply')!
const token = location.hash.slice(1)
let generation = 0
let waiting: ReturnType<typeof setTimeout> | undefined

locate.onclick = () => {
  if (!navigator.geolocation) {status.textContent = 'موقعیت‌یابی در این مرورگر پشتیبانی نمی‌شود.'; return}
  const current = ++generation
  locate.disabled = true; copy.disabled = true; apply.disabled = true; field.value = ''; accuracy.textContent = ''
  status.textContent = 'در حال دریافت موقعیت؛ درخواست دسترسی مرورگر را تأیید کنید.'
  navigator.geolocation.getCurrentPosition(position => {
    if (current !== generation) return
    locate.disabled = false
    try {
      const point = parseCoordinates(`${position.coords.latitude}, ${position.coords.longitude}`)
      field.value = `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`
      accuracy.textContent = `دقت تقریبی: ${Math.round(position.coords.accuracy).toLocaleString('fa-IR')} متر`
      copy.disabled = false; apply.disabled = false; status.textContent = 'موقعیت دریافت شد.'
    } catch {status.textContent = 'مختصات دریافت‌شده معتبر نیست؛ دوباره تلاش کنید.'}
  }, error => {
    if (current !== generation) return
    locate.disabled = false
    status.textContent = error.code === 1 ? 'اجازه موقعیت این سایت را در مرورگر فعال کنید و دوباره بزنید.' : error.code === 3 ? 'دریافت موقعیت طول کشید؛ دوباره تلاش کنید.' : 'موقعیت در دسترس نیست؛ مکان‌یابی گوشی را بررسی کنید.'
  }, {enableHighAccuracy: true, maximumAge: 0, timeout: 15000})
}
field.onfocus = () => field.select()
copy.onclick = async () => {
  try {await navigator.clipboard.writeText(field.value); status.textContent = 'مختصات کپی شد؛ به لاین‌یار برگردید و دکمه قرار دادن مختصات را بزنید.'}
  catch {field.focus(); field.select(); status.textContent = 'متن انتخاب شد؛ از منوی گوشی کپی کنید.'}
}
apply.onclick = () => {
  if (!window.opener || window.opener.closed || !token) {status.textContent = 'انتقال مستقیم در این محیط ممکن نیست؛ کپی مختصات را بزنید و به لاین‌یار برگردید.'; return}
  try {
    window.opener.postMessage({type: 'lineyar-location', token, coordinates: field.value}, location.origin)
    window.opener.focus()
    clearTimeout(waiting)
    waiting = setTimeout(() => {status.textContent = 'تأیید انتقال دریافت نشد؛ مختصات را کپی کنید و در لاین‌یار دکمه قرار دادن مختصات را بزنید.'}, 2000)
  } catch {status.textContent = 'انتقال ممکن نشد؛ از کپی مختصات استفاده کنید.'}
}
window.addEventListener('message', event => {
  if (event.source !== window.opener || event.origin !== location.origin || event.data?.type !== 'lineyar-location-applied' || event.data?.token !== token) return
  clearTimeout(waiting); status.textContent = 'مختصات در فرم پروژه قرار گرفت.'; window.close()
})
window.addEventListener('pagehide', () => {generation++; clearTimeout(waiting)})
