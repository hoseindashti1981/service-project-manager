import regularArabic from '@fontsource/vazirmatn/files/vazirmatn-arabic-400-normal.woff2?url'
import boldArabic from '@fontsource/vazirmatn/files/vazirmatn-arabic-700-normal.woff2?url'
import regularLatin from '@fontsource/vazirmatn/files/vazirmatn-latin-400-normal.woff2?url'
import boldLatin from '@fontsource/vazirmatn/files/vazirmatn-latin-700-normal.woff2?url'
export async function loadDocumentFonts(target:Document){
 const style=target.createElement('style')
 style.textContent=[[regularArabic,400,'U+0600-06FF,U+200C-200E,U+FB50-FDFF,U+FE70-FEFC'],[boldArabic,700,'U+0600-06FF,U+200C-200E,U+FB50-FDFF,U+FE70-FEFC'],[regularLatin,400,'U+0000-00FF,U+2000-200B,U+2010-206F'],[boldLatin,700,'U+0000-00FF,U+2000-200B,U+2010-206F']].map(([url,weight,range])=>`@font-face{font-family:Vazirmatn;font-style:normal;font-weight:${weight};src:url(${JSON.stringify(new URL(String(url),window.location.origin).href)}) format('woff2');unicode-range:${range};font-display:block}`).join('')
 target.head.appendChild(style)
 await Promise.all([target.fonts.load('400 16px Vazirmatn','آزمایش Invoice 123'),target.fonts.load('700 16px Vazirmatn','آزمایش Invoice 123')])
 await target.fonts.ready
}
