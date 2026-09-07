import {useEffect,useState} from 'react'
import {liveQuery} from 'dexie'
import {db} from '@/db/db'
import {defaultSettings} from './media'
export function useBusiness(){const [value,setValue]=useState(defaultSettings);useEffect(()=>{const s=liveQuery(()=>db.appSettings.get('business')).subscribe({next:v=>setValue(v??defaultSettings),error:()=>{}});return()=>s.unsubscribe()},[]);return value}
