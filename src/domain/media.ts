export interface Photo {id:string;projectId:string;activityId?:string;title:string;date:string;dataUrl:string;thumbnail:string;bytes:number;createdAt:number;updatedAt:number}
export interface AppSettings {id:'business';dashboardProjectOrder?:import('./project/dashboard-order').DashboardOrderStatus[];description?:string;helpOverrides?:Record<string,string>;defaultActivityRange?:'all'|'today';name:string;phone:string;address:string;logo?:string;banner?:string;favicon?:string;color:string;paymentInfo:string;createdAt:number;updatedAt:number}
export const defaultSettings:AppSettings={id:'business',name:'لاین‌یار',phone:'',address:'',color:'#4f46e5',paymentInfo:'',createdAt:0,updatedAt:0}
export async function compressImage(file:File,max=1600,preserveTransparency=false){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024)throw Error('عکس JPG، PNG یا WebP تا ۲۰ مگابایت انتخاب کنید.')
 const bitmap=await createImageBitmap(file)
 try{if(bitmap.width*bitmap.height>60000000)throw Error('ابعاد تصویر بیش از حد مجاز است.')
 const draw=(size:number,quality:number)=>{const scale=Math.min(1,size/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d')!;if(!preserveTransparency){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);}ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);return canvas.toDataURL(preserveTransparency?'image/png':'image/jpeg',quality)}
 let dataUrl=draw(max,.78);if(dataUrl.length>1400000)dataUrl=draw(Math.min(max,1200),.65);if(dataUrl.length>2000000)throw Error('عکس پس از فشرده‌سازی هنوز بزرگ است.')
 return {dataUrl,thumbnail:draw(240,.6),bytes:Math.ceil(dataUrl.split(',')[1].length*3/4)}
 }finally{bitmap.close()}
}
