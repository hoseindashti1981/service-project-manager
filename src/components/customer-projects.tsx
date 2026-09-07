import {useEffect,useState} from 'react'
import {liveQuery} from 'dexie'
import {Link} from '@tanstack/react-router'
import {db} from '@/db/db'
import type {Project} from '@/domain/project/types'
import {AccountCard} from './account-card'
export function CustomerProjects({customerId}:{customerId:string}){const [projects,setProjects]=useState<Project[]>([]);useEffect(()=>{const s=liveQuery(()=>db.projects.where('customerId').equals(customerId).toArray()).subscribe(setProjects);return()=>s.unsubscribe()},[customerId]);return <section className="space-y-3">{projects.map(project=><div key={project.id}><Link className="text-indigo-700 min-h-11 block" to="/projects/$projectId" params={{projectId:project.id}}>{project.title}</Link><AccountCard projectId={project.id} title={project.title}/></div>)}</section>}
