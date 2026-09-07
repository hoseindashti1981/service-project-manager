import {createContext,useContext} from 'react'
export const LockContext=createContext({enabled:false,open:()=>{},lock:()=>{}})
export const useAppLock=()=>useContext(LockContext)
