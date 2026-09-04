import { jsPDF } from 'jspdf'

export async function downloadDocumentPdf(title: string, number: string, date: string, total: number, lines: Array<{ description: string; quantity: number; unitPrice: number; total: number }>) {
  const node = document.createElement('div')
  node.dir = 'rtl'
  node.style.cssText = 'position:fixed;left:-10000px;top:0;width:700px;padding:36px;font-family:Tahoma,Arial;color:#0f172a;background:#fff;direction:rtl'
  node.innerHTML = `<h1 style="font-size:24px">${title}</h1><p>شماره: ${number} &nbsp; | &nbsp; تاریخ: ${date}</p><hr/><table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:right">شرح</th><th>تعداد</th><th>قیمت واحد</th><th>جمع</th></tr></thead><tbody>${lines.map((line) => `<tr><td style="padding:10px 0">${line.description}</td><td>${line.quantity}</td><td>${line.unitPrice.toLocaleString('fa-IR')}</td><td>${line.total.toLocaleString('fa-IR')}</td></tr>`).join('')}</tbody></table><hr/><h2>جمع کل: ${total.toLocaleString('fa-IR')} تومان</h2>`
  document.body.appendChild(node)
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  await doc.html(node, { x: 36, y: 36, width: 523, windowWidth: 700, autoPaging: 'text' })
  document.body.removeChild(node)
  doc.save(`${number}.pdf`)
}
