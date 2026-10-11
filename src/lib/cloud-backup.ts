import { backupRepository } from '@/db/repositories/backup-repository'
import { decryptBackup, encryptBackup } from '@/domain/backup/cloud-crypto'
import type { BackupData } from '@/domain/backup/types'

export const CLOUD_BACKUP_KEY='lineyar-cloud-backup-key'
const LAST_HASH='lineyar-cloud-backup-hash',LAST_TIME='lineyar-cloud-backup-time',LAST_ERROR='lineyar-cloud-backup-error'
const endpoint=String(import.meta.env.VITE_CLOUD_BACKUP_ENDPOINT||'').replace(/\/$/,'')
export interface CloudBackupItem {id:string;exportedAt:string;createdAt:string;bytes:number}
const key=()=>localStorage.getItem(CLOUD_BACKUP_KEY)||''
async function request(path:string,options:RequestInit={}){if(!endpoint)throw Error('آدرس بکاپ ابری در این نسخه تنظیم نشده است.');const accessKey=key();if(!accessKey)throw Error('ابتدا کد اتصال بکاپ ابری را ثبت کنید.');const response=await fetch(endpoint+path,{...options,headers:{Authorization:`Bearer ${accessKey}`,...options.headers}});const result=await response.json().catch(()=>null) as {error?:string}|null;if(!response.ok)throw Error(result?.error||'ارتباط با سرور بکاپ انجام نشد.');return result}
async function dataHash(backup:BackupData){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(backup.data)));return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('')}

export const cloudBackupEnabled=()=>!!endpoint
export const cloudBackupKey=key
export function saveCloudBackupKey(value:string){const normalized=value.trim();if(!/^[A-Za-z0-9_-]{43}$/.test(normalized))throw Error('کد اتصال معتبر نیست.');localStorage.setItem(CLOUD_BACKUP_KEY,normalized);localStorage.removeItem(LAST_HASH);localStorage.removeItem(LAST_ERROR)}
export function removeCloudBackupKey(){localStorage.removeItem(CLOUD_BACKUP_KEY);localStorage.removeItem(LAST_HASH);localStorage.removeItem(LAST_ERROR)}
export const cloudBackupStatus=()=>({lastTime:localStorage.getItem(LAST_TIME),lastError:localStorage.getItem(LAST_ERROR)})
export async function uploadCloudBackup(force=false){const backup=await backupRepository.exportTextOnly(),hash=await dataHash(backup);if(!force&&hash===localStorage.getItem(LAST_HASH))return false;const body=JSON.stringify({exportedAt:backup.exportedAt,backup:await encryptBackup(backup,key())});await request('',{method:'POST',headers:{'Content-Type':'application/json'},body});localStorage.setItem(LAST_HASH,hash);localStorage.setItem(LAST_TIME,new Date().toISOString());localStorage.removeItem(LAST_ERROR);window.dispatchEvent(new Event('lineyar-cloud-backup'));return true}
export async function listCloudBackups(){return (await request('') as {items:CloudBackupItem[]}).items||[]}
export async function downloadCloudBackup(id:string){const result=await request('?id='+encodeURIComponent(id)) as {backup:unknown};return decryptBackup(result.backup,key())}
export function recordCloudBackupError(error:unknown){localStorage.setItem(LAST_ERROR,error instanceof Error?error.message:'بکاپ خودکار انجام نشد.');window.dispatchEvent(new Event('lineyar-cloud-backup'))}
