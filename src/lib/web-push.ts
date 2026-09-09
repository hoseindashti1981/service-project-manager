import {isStandalone} from './pwa-display'
import {defaultPushPublicKey} from '@/config/push-public-key'
export const PUSH_STORAGE_KEY='lineyar-push-subscription-v1'
export interface StoredPushSubscription {subscription:PushSubscriptionJSON;publicKey:string;savedAt:string}
let running:Promise<StoredPushSubscription>|undefined
function applicationKey(value:string){if(!/^[A-Za-z0-9_-]+$/.test(value))throw Error('کلید عمومی اعلان معتبر نیست.');const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));if(bytes.length!==65||bytes[0]!==4)throw Error('کلید عمومی اعلان معتبر نیست.');return bytes}
export function subscribeToPush():Promise<StoredPushSubscription>{
 if(running)return running
 if(!isStandalone())return Promise.reject(Error('برنامه را پس از Add to Home Screen از آیکن صفحه اصلی باز کنید.'))
 if(!window.isSecureContext||!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))return Promise.reject(Error('Web Push در این محیط پشتیبانی نمی‌شود.'))
 const publicKey=import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY||defaultPushPublicKey
 let key:Uint8Array<ArrayBuffer>;try{key=applicationKey(publicKey)}catch(e){return Promise.reject(e)}
 let permission:Promise<NotificationPermission>;try{permission=Notification.requestPermission()}catch(e){return Promise.reject(e)}
 running=(async()=>{
  if(await permission!=='granted')throw Error('اجازه اعلان داده نشد؛ تنظیمات اعلان نسخه نصب‌شده را بررسی کنید.')
  const registration=await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
  if(!registration?.active)throw Error('برنامه هنوز برای اعلان آماده نیست؛ یک بار آنلاین باز کنید و دوباره بزنید.')
  let subscription=await registration.pushManager.getSubscription()
  if(subscription?.options.applicationServerKey){const previous=new Uint8Array(subscription.options.applicationServerKey);if(previous.length!==key.length||previous.some((x,i)=>x!==key[i]))throw Error('کلید اشتراک قبلی متفاوت است؛ ابتدا غیرفعال و سپس دوباره فعال کنید.')}
  subscription??=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key})
  const stored:StoredPushSubscription={subscription:subscription.toJSON(),publicKey,savedAt:new Date().toISOString()}
  localStorage.setItem(PUSH_STORAGE_KEY,JSON.stringify(stored))
  if(import.meta.env.DEV)console.info('LineYar Web Push subscription',stored.subscription)
  const endpoint=import.meta.env.VITE_WEB_PUSH_SUBSCRIPTION_ENDPOINT
  if(endpoint){const url=new URL(endpoint,location.origin);if(url.protocol!=='https:'&&url.origin!==location.origin)throw Error('آدرس ثبت اشتراک باید HTTPS باشد.');const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),15000);try{const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(stored.subscription),signal:abort.signal});if(!response.ok)throw Error('اشتراک روی دستگاه ذخیره شد، ولی ارسال به سرور ناموفق بود.')}finally{clearTimeout(timer)}}
  return stored
 })().finally(()=>{running=undefined});return running
}
export async function unsubscribeFromPush(){const registration=await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL),subscription=await registration?.pushManager.getSubscription();if(subscription&&!await subscription.unsubscribe())throw Error('غیرفعال‌سازی انجام نشد.');localStorage.removeItem(PUSH_STORAGE_KEY)}
