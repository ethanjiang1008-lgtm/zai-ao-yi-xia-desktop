// 数据导出/导入/清空（需求第二十八节"数据"设置）

const ZYX_PREFIX = 'zyx-'

export function exportData(): string {
  const data: Record<string, string | null> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(ZYX_PREFIX)) {
      data[k] = localStorage.getItem(k)
    }
  }
  data['__exported_at'] = new Date().toISOString()
  return JSON.stringify(data, null, 2)
}

export function downloadExport(): void {
  const json = exportData()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `zai-ao-yi-xia-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export interface ImportResult {
  ok: boolean
  count: number
  error?: string
}

export async function importData(file: File): Promise<ImportResult> {
  try {
    const text = await file.text()
    const obj = JSON.parse(text)
    if (typeof obj !== 'object' || obj === null) {
      return { ok: false, count: 0, error: '文件格式不正确' }
    }
    let count = 0
    for (const k of Object.keys(obj)) {
      if (k.startsWith(ZYX_PREFIX) || k === '__exported_at') {
        const v = obj[k]
        if (typeof v === 'string') {
          localStorage.setItem(k, v)
          count++
        }
      }
    }
    return { ok: true, count }
  } catch {
    return { ok: false, count: 0, error: '无法解析文件，请选择有效的备份文件' }
  }
}

export function clearAllData(): void {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(ZYX_PREFIX)) keys.push(k)
  }
  keys.forEach((k) => localStorage.removeItem(k))
}
