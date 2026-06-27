/** Download a 2D array as a CSV file */
export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv  = rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Download a Recharts SVG chart as a PNG image */
export function downloadChartPNG(containerId: string, filename: string) {
  const svg = document.querySelector(`#${containerId} svg`) as SVGSVGElement | null
  if (!svg) return
  const xml    = new XMLSerializer().serializeToString(svg)
  const blob   = new Blob([xml], { type: 'image/svg+xml' })
  const url    = URL.createObjectURL(blob)
  const img    = new Image()
  img.onload = () => {
    const canvas  = document.createElement('canvas')
    canvas.width  = svg.clientWidth  || 800
    canvas.height = svg.clientHeight || 400
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
  img.src = url
}
