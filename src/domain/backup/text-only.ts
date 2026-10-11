import type { BackupRows } from './types'

type Row = Record<string, unknown>
const without = (row: Row, keys: string[]) => Object.fromEntries(Object.entries(row).filter(([key]) => !keys.includes(key)))
function stripDocument(row: Row): Row {
  const clean = without(row,['qrData'])
  if (clean.business && typeof clean.business === 'object' && !Array.isArray(clean.business)) clean.business=without(clean.business as Row,['logo'])
  return clean
}
function restoreDocumentMedia(row: Row, local?: Row): Row {
  if (!local) return row
  const restored={...row}
  if (local.qrData) restored.qrData=local.qrData
  if (local.business && typeof local.business === 'object' && !Array.isArray(local.business)) {
    const logo=(local.business as Row).logo
    if (logo) restored.business={...(restored.business as Row),logo}
  }
  return restored
}

export function textOnlyRows(source: BackupRows): BackupRows {
  const data=structuredClone(source)
  data.photos=[]
  data.appSettings=data.appSettings.map(row=>without(row,['logo','banner','favicon']))
  data.invoices=data.invoices.map(stripDocument)
  data.quotations=data.quotations.map(stripDocument)
  return data
}

export function preserveLocalMedia(remote: BackupRows, local: BackupRows): BackupRows {
  const data=structuredClone(remote)
  const settings=new Map(local.appSettings.map(row=>[row.id,row]))
  data.photos=structuredClone(local.photos)
  data.appSettings=data.appSettings.map(row=>({...row,...Object.fromEntries(['logo','banner','favicon'].flatMap(key=>settings.get(row.id)?.[key] ? [[key,settings.get(row.id)![key]]] : []))}))
  for(const table of ['invoices','quotations'] as const){const rows=new Map(local[table].map(row=>[row.id,row]));data[table]=data[table].map(row=>restoreDocumentMedia(row,rows.get(row.id)))}
  return data
}
