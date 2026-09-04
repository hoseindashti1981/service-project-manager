import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

type Line = { description: string; quantity: number; unitPrice: number; total: number }

export async function downloadDocumentPdf(title: string, number: string, date: string, total: number, lines: Line[]) {
  const node = document.createElement('section')
  node.dir = 'rtl'
  node.style.cssText = 'position:fixed;inset:0 auto auto 0;width:794px;padding:42px;background:#fff;color:#0f172a;font-family:Tahoma,Arial,sans-serif;z-index:99999;direction:rtl;box-sizing:border-box'
  node.innerHTML = '<div style="border-bottom:3px solid #4f46e5;padding-bottom:18px"><h1 style="margin:0;font-size:28px">' + escapeHtml(title) + '</h1><p style="margin:10px 0 0;color:#475569">شماره: ' + escapeHtml(number) + ' | تاریخ: ' + escapeHtml(date) + '</p></div><table style="width:100%;margin-top:24px;border-collapse:collapse;font-size:14px"><thead><tr style="background:#eef2ff"><th style="padding:10px;text-align:right">شرح</th><th style="padding:10px">تعداد</th><th style="padding:10px">قیمت واحد</th><th style="padding:10px">جمع</th></tr></thead><tbody>' + lines.map((line) => '<tr style="border-bottom:1px solid #e2e8f0"><td style="padding:12px;text-align:right">' + escapeHtml(line.description) + '</td><td style="padding:12px;text-align:center">' + line.quantity.toLocaleString('fa-IR') + '</td><td style="padding:12px;text-align:center">' + line.unitPrice.toLocaleString('fa-IR') + '</td><td style="padding:12px;text-align:center">' + line.total.toLocaleString('fa-IR') + '</td></tr>').join('') + '</tbody></table><div style="margin-top:26px;background:#f1f5f9;padding:16px;font-size:18px;font-weight:bold">جمع کل: ' + total.toLocaleString('fa-IR') + ' تومان</div>'
  document.body.appendChild(node)
  try {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imageHeight = canvas.height * (pageWidth / canvas.width)
    for (let offset = 0; offset < imageHeight; offset += pageHeight) {
      if (offset > 0) pdf.addPage()
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, -offset, pageWidth, imageHeight)
    }
    pdf.save(number + '.pdf')
  } finally { node.remove() }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]!))
}
