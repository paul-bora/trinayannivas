// Downloads rows as a CSV file that opens in Excel or Google Sheets.
export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    alert('Nothing to export')
    return
  }
  const headers = Object.keys(rows[0])
  const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [headers.map(cell).join(','), ...rows.map((r) => headers.map((h) => cell(r[h])).join(','))]
  const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
