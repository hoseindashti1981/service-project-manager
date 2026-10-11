import type { BackupData } from './types'

export interface EncryptedBackup {format:'lineyar-cloud-backup';version:1;iv:string;ciphertext:string}
const bytesToBase64=(bytes:Uint8Array)=>{let value='';for(let index=0;index<bytes.length;index+=32768)value+=String.fromCharCode(...bytes.subarray(index,index+32768));return btoa(value).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}
const base64ToBytes=(value:string)=>{if(!/^[A-Za-z0-9_-]+$/.test(value))throw Error('داده رمزگذاری‌شده معتبر نیست.');const binary=atob(value.replaceAll('-','+').replaceAll('_','/').padEnd(Math.ceil(value.length/4)*4,'='));return Uint8Array.from(binary,char=>char.charCodeAt(0))}
const importKey=(value:string)=>crypto.subtle.importKey('raw',base64ToBytes(value),'AES-GCM',false,['encrypt','decrypt'])

export function generateCloudKey(){return bytesToBase64(crypto.getRandomValues(new Uint8Array(32)))}
export async function encryptBackup(backup:BackupData,key:string):Promise<EncryptedBackup>{const iv=crypto.getRandomValues(new Uint8Array(12)),ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},await importKey(key),new TextEncoder().encode(JSON.stringify(backup)));return {format:'lineyar-cloud-backup',version:1,iv:bytesToBase64(iv),ciphertext:bytesToBase64(new Uint8Array(ciphertext))}}
export async function decryptBackup(value:unknown,key:string):Promise<unknown>{if(!value||typeof value!=='object')throw Error('نسخه ابری معتبر نیست.');const item=value as Partial<EncryptedBackup>;if(item.format!=='lineyar-cloud-backup'||item.version!==1||typeof item.iv!=='string'||typeof item.ciphertext!=='string')throw Error('نسخه ابری معتبر نیست.');try{return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:base64ToBytes(item.iv)},await importKey(key),base64ToBytes(item.ciphertext))))}catch{throw Error('کد اتصال نادرست است یا نسخه ابری آسیب دیده است.')}}
