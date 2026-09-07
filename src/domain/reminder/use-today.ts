import {useEffect,useState} from 'react'
import {toISODate} from '@/lib/dates'
export function useToday(){
  const [today,setToday]=useState(toISODate)
  useEffect(()=>{const update=()=>setToday(toISODate());const timer=setInterval(update,30000);document.addEventListener('visibilitychange',update);window.addEventListener('focus',update);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',update);window.removeEventListener('focus',update)}},[])
  return today
}
