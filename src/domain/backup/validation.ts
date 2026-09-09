import {validDashboardOrder} from '../project/dashboard-order'
import { isValidDate } from '@/lib/dates'
import { backupTables, backupTableLabels, type BackupTable, type BackupRows, type BackupPreview, type BackupData } from './types'

type Row = Record<string, unknown>
const object = (value: unknown): value is Row => !!value && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown) => typeof value === 'string'
const id = (value: unknown) => text(value) && (value as string).trim().length > 0
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
const money = (value: unknown) => number(value) && Number.isSafeInteger(value) && (value as number) >= 0
const date = (value: unknown) => typeof value === 'string' && isValidDate(value)
const timestamp = (value: unknown) => money(value) && (value as number) <= 8640000000000000
const choice = (values: string[]) => (value: unknown) => typeof value === 'string' && values.includes(value)
const units = ['meter','piece','point','hour','day','device','project','service','fixed']
const statuses = ['draft','planned','active','in_progress','paused','completed','delivered','cancelled']
function fail(where: string, field: string): never { throw new Error(`${where}: مقدار «${field}» معتبر نیست.`) }
function field(row: Row, key: string, check: (value: unknown) => boolean, where: string, optional = false) {
  if (row[key] === undefined && optional) return
  if (!check(row[key])) fail(where, key)
}
function base(row: Row, where: string) {
  field(row,'id',id,where); field(row,'createdAt',timestamp,where); field(row,'updatedAt',timestamp,where)
}
function unique(rows: Row[], where: string) {
  const ids = new Set<unknown>()
  for (const row of rows) { if (!object(row) || !id(row.id)) fail(where,'id'); if (ids.has(row.id)) throw new Error(`${where}: شناسه تکراری وجود دارد.`); ids.add(row.id) }
}
function activity(row: Row, where: string) {
  base(row,where); field(row,'projectId',id,where); field(row,'projectItemId',id,where,true); field(row,'date',date,where); field(row,'title',id,where)
  field(row,'amount',money,where,true); field(row,'quantity',number,where,true); field(row,'unit',text,where,true); field(row,'note',text,where,true)
}
function validateRow(table: BackupTable, row: Row, where: string) {
  base(row,where)
  for (const key of ['description','note']) field(row,key,text,where,true)
  if (['customers','services'].includes(table)) field(row,'name',id,where)
  if (['projects','projectItems','projectChanges','materials','expenses','reminders'].includes(table)) field(row,'title',id,where)
  if (['projectItems','projectActivities','projectChanges','materials','expenses'].includes(table)) field(row,'projectId',id,where)
  if (['customers','services','projectItems','materials'].includes(table)) field(row,'date',date,where,true)
  switch(table) {
    case 'customers': field(row,'mobile',text,where); break
    case 'services': field(row,'defaultUnit',choice(units),where); field(row,'defaultUnitPrice',money,where,true); field(row,'isActive',value => typeof value === 'boolean',where); break
    case 'projects': {
      field(row,'discount',money,where,true)
      field(row,'customerId',id,where); field(row,'status',choice(statuses),where); field(row,'contractAmount',money,where,true)
      for (const key of ['address','workType']) field(row,key,text,where,true)
      for (const key of ['latitude','longitude']) field(row,key,number,where,true)
      for (const key of ['startDate','plannedEndDate','actualEndDate','agreementDate','executionStartDate','deliveryDate']) field(row,key,date,where,true)
      if (row.statusHistory !== undefined) {
        if (!Array.isArray(row.statusHistory)) fail(where,'statusHistory')
        unique(row.statusHistory,where)
        for (const entry of row.statusHistory as Row[]) {
          field(entry,'kind',choice(['status','dates']),where); field(entry,'from',value => value === null || choice(statuses)(value),where); field(entry,'to',choice(statuses),where); field(entry,'effectiveDate',date,where); field(entry,'recordedAt',timestamp,where); field(entry,'reason',text,where,true)
          for (const key of ['datesBefore','datesAfter']) if (entry[key] !== undefined) { if (!object(entry[key])) fail(where,key); for (const value of Object.values(entry[key] as Row)) if (value !== undefined && !date(value)) fail(where,key) }
        }
      }
      if (row.activityAudit !== undefined) {
        if (!Array.isArray(row.activityAudit)) fail(where,'activityAudit')
        unique(row.activityAudit,where)
        for (const entry of row.activityAudit as Row[]) {
          field(entry,'action',choice(['create','update','delete']),where); field(entry,'activityId',id,where); field(entry,'recordedAt',timestamp,where); field(entry,'reason',text,where,true)
          for (const key of ['before','after']) if (entry[key] !== undefined) { if (!object(entry[key])) fail(where,key); activity(entry[key] as Row,where); if ((entry[key] as Row).id !== entry.activityId || (entry[key] as Row).projectId !== row.id) fail(where,'activityAudit') }
          if ((entry.action !== 'create' && !entry.before) || (entry.action !== 'delete' && !entry.after)) fail(where,'activityAudit')
        }
      }
      break
    }
    case 'projectItems':
      field(row,'serviceId',id,where,true); field(row,'unit',choice(units),where); field(row,'quantity',number,where); field(row,'unitPrice',money,where); field(row,'totalPrice',money,where); field(row,'pricingType',choice(['PER_UNIT','PER_METER','PER_POINT','PER_HOUR','PER_DAY','FIXED','CUSTOM']),where)
      if (Math.round((row.quantity as number)*(row.unitPrice as number)) !== row.totalPrice) fail(where,'totalPrice')
      break
    case 'projectActivities': activity(row,where); break
    case 'projectChanges': field(row,'amount',value => number(value) && Number.isSafeInteger(value),where); field(row,'date',date,where); break
    case 'expenses': field(row,'amount',money,where); field(row,'date',date,where); break
    case 'materials': field(row,'quantity',number,where); field(row,'unit',id,where); field(row,'cost',money,where); field(row,'source',choice(['customer','contractor']),where); break
    case 'reminders': field(row,'dueDate',date,where); field(row,'projectId',id,where,true); field(row,'status',choice(['open','done']),where); break
    case 'quotations': case 'invoices': {
      field(row,'customerId',id,where); field(row,'projectId',id,where,true); field(row,'quotationId',id,where,true); field(row,'number',id,where); field(row,'date',date,where); field(row,'total',money,where); field(row,'voidReason',text,where,true)
      field(row,'status',choice(table === 'invoices' ? ['draft','issued','paid','void'] : ['draft','sent','accepted','rejected']),where)
      if (!Array.isArray(row.lines)) fail(where,'lines')
      unique(row.lines,where)
      for (const line of row.lines as Row[]) { field(line,'description',text,where); field(line,'quantity',number,where); field(line,'unitPrice',money,where); field(line,'total',money,where); if (Math.round((line.quantity as number)*(line.unitPrice as number)) !== line.total) fail(where,'lines.total') }
      for(const key of ['discount','tax','extraFee'])field(row,key,money,where,true)
      field(row,'dueDate',date,where,true)
      for(const key of ['terms','paymentInfo','projectSnapshot','projectAddress'])field(row,key,text,where,true)
      if(row.business!==undefined){if(!object(row.business))fail(where,'business');for(const key of ['name','phone','address'])field(row.business as Row,key,text,where);field(row.business as Row,'logo',value=>typeof value==='string'&&value.length<=2000000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value),where,true)}
      if(row.customerSnapshot!==undefined){if(!object(row.customerSnapshot))fail(where,'customerSnapshot');for(const key of ['name','mobile'])field(row.customerSnapshot as Row,key,text,where);field(row.customerSnapshot as Row,'address',text,where,true)}
      field(row,'qrData',value=>typeof value==='string'&&value.length<=2000000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value),where,true)
      const subtotal=(row.lines as Row[]).reduce((sum,line) => sum + (line.total as number),0)
      if(Number(row.discount??0)>subtotal||subtotal-Number(row.discount??0)+Number(row.tax??0)+Number(row.extraFee??0)!==row.total)fail(where,'total')
      break
    }
    case 'payments': field(row,'customerId',id,where); field(row,'projectId',id,where,true); field(row,'invoiceId',id,where,true); field(row,'amount',money,where); field(row,'date',date,where); field(row,'method',choice(['cash','card','transfer','cheque','other']),where); break
    case 'photos':
      field(row,'projectId',id,where);field(row,'activityId',id,where,true);field(row,'title',text,where);field(row,'date',date,where);field(row,'bytes',money,where)
      for(const key of ['dataUrl','thumbnail'])field(row,key,value=>typeof value==='string'&&value.length<=2000000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value),where)
      break
    case 'appSettings':
      if(row.dashboardProjectOrder!==undefined&&!validDashboardOrder(row.dashboardProjectOrder))fail(where,'dashboardProjectOrder')
      if(row.helpOverrides!==undefined&&(!object(row.helpOverrides)||Object.keys(row.helpOverrides).length>30||Object.entries(row.helpOverrides).some(([key,value])=>!/^\/[a-z/]*$/.test(key)||key.length>60||typeof value!=='string'||value.length>200000)))fail(where,'helpOverrides')
      field(row,'defaultActivityRange',choice(['all','today']),where,true)
      if(row.id!=='business')fail(where,'id');field(row,'description',text,where,true)
      for(const key of ['name','phone','address','paymentInfo'])field(row,key,text,where)
      field(row,'color',value=>typeof value==='string'&&/^#[a-fA-F0-9]{6}$/.test(value),where)
      for(const key of ['logo','banner','favicon'])field(row,key,value=>typeof value==='string'&&value.length<=2000000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value),where,true)
      break
  }
}
function relationshipWarnings(data: BackupRows): string[] {
  const warnings = new Set<string>()
  const maps = Object.fromEntries(backupTables.map(table => [table, new Map(data[table].map(row => [row.id,row]))])) as Record<BackupTable, Map<unknown, Row>>
  for (const table of backupTables) for (const row of data[table]) {
    const relations: [string,BackupTable][] = [['customerId','customers'],['projectId','projects'],['serviceId','services'],['projectItemId','projectItems'],['quotationId','quotations'],['invoiceId','invoices']]
    for (const [key,target] of relations) if (row[key] !== undefined && !maps[target].has(row[key])) warnings.add(`در «${backupTableLabels[table]}» ارجاع به ${backupTableLabels[target]} حذف‌شده وجود دارد؛ رکوردها بدون حذف یا تغییر حفظ می‌شوند.`)
    const item = maps.projectItems.get(row.projectItemId)
    if (item && item.projectId !== row.projectId) throw new Error('ارتباط فعالیت و خدمت پروژه ناسازگار است.')
    const project = maps.projects.get(row.projectId)
    if(table==='photos'&&row.activityId!==undefined){const activity=maps.projectActivities.get(row.activityId);if(activity&&activity.projectId!==row.projectId)throw Error('عکس و فعالیت به پروژه‌های متفاوت متصل‌اند.')}
    if(table==='projects'&&Number(row.discount??0)>Number(row.contractAmount??0)+data.projectChanges.filter(c=>c.projectId===row.id).reduce((s,c)=>s+Number(c.amount),0))throw Error('تخفیف پروژه از مبلغ قرارداد و کار اضافه بیشتر است.')
    if (project && row.customerId && project.customerId !== row.customerId) warnings.add('بعضی اسناد مالی به مشتری متفاوت از مشتری پروژه متصل‌اند؛ پس از بازیابی بررسی شوند.')
  }
  return [...warnings]
}
export function parseBackup(value: unknown): BackupPreview {
  if (!object(value) || (value.version !== 1 && value.version !== 2 && value.version !== 3)) throw new Error('نسخه فایل پشتیبان پشتیبانی نمی‌شود؛ فایل معتبر همین برنامه را انتخاب کنید.')
  if (!text(value.exportedAt) || !/^\d{4}-\d{2}-\d{2}T/.test(value.exportedAt as string) || !Number.isFinite(Date.parse(value.exportedAt as string))) throw new Error('زمان ایجاد بکاپ معتبر نیست.')
  if (value.version !== 1 && value.format !== 'lineyar-backup') throw new Error('نوع فایل پشتیبان معتبر نیست.')
  if (!object(value.data)) throw new Error('جدول‌های فایل پشتیبان معتبر نیستند.')
  if (Object.keys(value.data).some(key => !backupTables.includes(key as BackupTable))) throw new Error('فایل جدول ناشناخته دارد؛ برای جلوگیری از حذف اطلاعات، ابتدا برنامه را به نسخه سازگار ارتقا دهید.')
  const data = {} as BackupRows
  const warnings: string[] = []
  for (const table of backupTables) {
    const rows = value.data[table]
    if(value.version!==3 && ['photos','appSettings'].includes(table) && rows===undefined){data[table]=[];warnings.push(`بکاپ قدیمی ${backupTableLabels[table]} ندارد؛ جایگزینی آن این بخش را خالی می‌کند. نسخه بازگشت محفوظ است.`);continue}
    if (table === 'reminders' && value.version === 1 && rows === undefined) { data[table] = []; warnings.push('این بکاپ قدیمی یادآورها را ندارد؛ با بازیابی آن، یادآورهای فعلی از مجموعه فعال حذف می‌شوند و در نسخه بازگشت خودکار باقی می‌مانند.'); continue }
    if (!Array.isArray(rows)) throw new Error(`جدول «${backupTableLabels[table]}» در فایل وجود ندارد یا معتبر نیست.`)
    unique(rows,backupTableLabels[table])
    for (let index=0; index<rows.length; index++) validateRow(table, rows[index], `${backupTableLabels[table]}، ردیف ${index+1}`)
    data[table] = rows
  }
  if (value.version === 1) warnings.push('فایل نسخه قدیمی است و کد کنترل یکپارچگی ندارد؛ ساختار و محتوا بررسی شده‌اند.')
  return { version:value.version, exportedAt:value.exportedAt as string, data, counts:Object.fromEntries(backupTables.map(table => [table,data[table].length])) as BackupPreview['counts'], warnings:[...warnings,...relationshipWarnings(data)] }
}
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key,item) => object(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key,item[key]])) : item)
}
async function digest(value: unknown): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value)))
  return Array.from(new Uint8Array(hash),byte => byte.toString(16).padStart(2,'0')).join('')
}
export async function createBackup(data: BackupRows, exportedAt = new Date().toISOString()): Promise<BackupData> {
  const payload = { format:'lineyar-backup' as const, version:3 as const, exportedAt, data }
  return { ...payload, checksum:{ algorithm:'SHA-256', value:await digest(payload) } }
}
export async function inspectBackup(value: unknown): Promise<BackupPreview> {
  const preview = parseBackup(value)
  if (preview.version !== 1) {
    const backup = value as BackupData
    if (!object(backup.checksum) || backup.checksum.algorithm !== 'SHA-256' || typeof backup.checksum.value !== 'string' || !/^[a-f0-9]{64}$/.test(backup.checksum.value)) throw new Error('کد کنترل یکپارچگی بکاپ وجود ندارد یا معتبر نیست.')
    const expected = await digest({ format:backup.format, version:backup.version, exportedAt:backup.exportedAt, data:backup.data })
    if (expected !== backup.checksum.value) throw new Error('محتوای فایل تغییر کرده یا آسیب دیده است؛ بازیابی انجام نمی‌شود.')
  }
  return preview
}
