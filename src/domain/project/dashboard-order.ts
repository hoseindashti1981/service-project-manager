export const dashboardOrderOptions=['in_progress','draft','paused','delivered'] as const
export type DashboardOrderStatus=typeof dashboardOrderOptions[number]
export const defaultDashboardOrder:DashboardOrderStatus[]=[...dashboardOrderOptions]
export function validDashboardOrder(value:unknown):value is DashboardOrderStatus[]{return Array.isArray(value)&&value.length===4&&new Set(value).size===4&&value.every(x=>dashboardOrderOptions.includes(x))}
export function orderDashboardProjects<T extends {status:string}>(projects:T[],order:unknown){const priorities=[...(validDashboardOrder(order)?order:defaultDashboardOrder),'planned','completed'];return [...projects].sort((a,b)=>{const rank=(s:string)=>{const i=priorities.indexOf(s);return i<0?priorities.length:i};return rank(a.status)-rank(b.status)})}
