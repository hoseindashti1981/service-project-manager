import {isoToJalali,toISODate} from './dates'
export function backupFilename(prefix:string,date=new Date()){
 const j=isoToJalali(toISODate(date)),pad=(n:number)=>String(n).padStart(2,'0')
 return `${prefix}-${j.year}-${pad(j.month)}-${pad(j.day)}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${String(date.getMilliseconds()).padStart(3,'0')}.json`
}
