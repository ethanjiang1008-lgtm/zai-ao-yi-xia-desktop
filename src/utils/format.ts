// 时间与格式工具

/** HH:mm → 当日分钟数 */
export function hhmmToMin(hm: string): number {
  const [h, m] = hm.split(':').map((x) => Number(x))
  return (h || 0) * 60 + (m || 0)
}

/** 当日分钟数 → HH:mm */
export function minToHHMM(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${pad2(h)}:${pad2(m)}`
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 秒 → HH:MM:SS */
export function fmtHMS(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`
}

/** 分钟 → "9h35m" / "35m" */
export function fmtMinHM(totalMin: number): string {
  const m = Math.max(0, Math.round(totalMin))
  const h = Math.floor(m / 60)
  const mm = m % 60
  if (h <= 0) return `${mm}m`
  return `${h}h${mm}m`
}

/** Date → YYYY-MM-DD（本地时区） */
export function dateStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
export function weekdayCN(d: Date): string {
  return WEEKDAYS[d.getDay()]
}

/** 友好日期头：☀️ 8月25日 · 星期二 */
export function dateHeader(d: Date): string {
  const icons = ['☀️', '☀️', '☀️', '☁️', '☁️', '🌧️', '🌧️']
  return `${icons[d.getDay()]} ${d.getMonth() + 1}月${d.getDate()}日 · ${weekdayCN(d)}`
}

/** seeded 随机（mulberry32） */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return h
}

/** uid */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
