import type { UserProfile, WorkSegment } from '../types'
import { hhmmToMin } from '../utils/format'

// 工资计算规则 + 实时收入引擎（需求第八、九节）
// 统一时间服务，避免多个组件各自 new Date()（第三十四节）

export type WorkState = 'offday' | 'before' | 'working' | 'break' | 'after'

export interface TodaySnapshot {
  state: WorkState
  workedSeconds: number
  totalSeconds: number
  progress: number // 0~1
  earnedFen: number // 今日已赚（分）
  perSecondFen: number // 每秒收入（分）
  hourlyFen: number
  dailyFen: number
  secondsToOff: number
  remainingEarnFen: number
  isWorkday: boolean
  nearOff: boolean
}

function segRanges(segments: WorkSegment[], d: Date): { startMin: number; endMin: number }[] {
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return segments
    .map((s) => ({
      startMin: hhmmToMin(s.start),
      endMin: hhmmToMin(s.end),
      startMs: base.getTime() + hhmmToMin(s.start) * 60000,
      endMs: base.getTime() + hhmmToMin(s.end) * 60000,
    }))
    .map((s) => ({ startMin: s.startMin, endMin: s.endMin }))
    .sort((a, b) => a.startMin - b.startMin)
}

function isWorkdayOfWeek(d: Date, weekdays: number[]): boolean {
  // JS getDay: 0=周日..6=周六；用户配置 1=周一..7=周日
  const jsDay = d.getDay()
  const userDay = jsDay === 0 ? 7 : jsDay
  return weekdays.includes(userDay)
}

function clampWorked(seg: WorkSegment, nowMs: number, baseMs: number): number {
  const start = baseMs + hhmmToMin(seg.start) * 60000
  const end = baseMs + hhmmToMin(seg.end) * 60000
  if (nowMs <= start) return 0
  if (nowMs >= end) return (end - start) / 1000
  return (nowMs - start) / 1000
}

export function dailyWageFen(p: UserProfile): number {
  return Math.round(p.monthlySalaryFen / Math.max(1, p.workingDaysPerMonth))
}

export function totalWorkSecondsPerDay(p: UserProfile): number {
  return p.segments.reduce((a, s) => a + (hhmmToMin(s.end) - hhmmToMin(s.start)) * 60, 0)
}

export function hourlyFen(p: UserProfile): number {
  const totalSec = totalWorkSecondsPerDay(p)
  if (totalSec <= 0) return 0
  return (dailyWageFen(p) * 3600) / totalSec
}

export function perSecondFen(p: UserProfile): number {
  return hourlyFen(p) / 3600
}

export function isWorkday(d: Date, p: UserProfile): boolean {
  return isWorkdayOfWeek(d, p.workWeekdays)
}

export function getTodaySnapshot(now: Date, p: UserProfile): TodaySnapshot {
  const ranges = segRanges(p.segments, now)
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const nowMs = now.getTime()
  const workday = isWorkday(now, p)

  const totalSec = totalWorkSecondsPerDay(p)
  const perSec = perSecondFen(p)
  const hourFen = hourlyFen(p)

  if (!workday || ranges.length === 0) {
    return {
      state: 'offday',
      workedSeconds: 0,
      totalSeconds: totalSec,
      progress: 0,
      earnedFen: 0,
      perSecondFen: perSec,
      hourlyFen: hourFen,
      dailyFen: dailyWageFen(p),
      secondsToOff: 0,
      remainingEarnFen: 0,
      isWorkday: false,
      nearOff: false,
    }
  }

  const worked = p.segments.reduce((a, seg) => a + clampWorked(seg, nowMs, base), 0)
  const earned = worked * perSec
  const progress = totalSec > 0 ? worked / totalSec : 0

  const lastEndMin = Math.max(...ranges.map((r) => r.endMin))
  const secondsToOff =
    nowMs >= base + lastEndMin * 60000 ? 0 : base + lastEndMin * 60000 - nowMs

  // 状态判断
  let state: WorkState = 'before'
  const firstStartMin = Math.min(...ranges.map((r) => r.startMin))
  const nowMin = nowMs === base ? 0 : Math.floor((nowMs - base) / 60000)
  if (nowMin < firstStartMin) state = 'before'
  else if (nowMin >= lastEndMin) state = 'after'
  else {
    // 在工作区间内还是午休
    state = 'working'
    for (const r of ranges) {
      if (nowMin >= r.startMin && nowMin < r.endMin) {
        state = 'working'
        break
      }
      state = 'break'
    }
  }

  const remainingEarn = Math.max(0, (totalSec - worked) * perSec)
  const nearOff = state === 'working' && secondsToOff > 0 && secondsToOff <= 1800

  return {
    state,
    workedSeconds: worked,
    totalSeconds: totalSec,
    progress,
    earnedFen: Math.round(earned),
    perSecondFen: perSec,
    hourlyFen: hourFen,
    dailyFen: dailyWageFen(p),
    secondsToOff: Math.max(0, Math.round(secondsToOff / 1000)),
    remainingEarnFen: Math.round(remainingEarn),
    isWorkday: true,
    nearOff,
  }
}

/** 目标预计完成日期：从今天起按工作日累加日薪直到覆盖剩余金额 */
export function goalEtaDate(now: Date, p: UserProfile, remainingFen: number): Date {
  if (remainingFen <= 0) return now
  const daily = dailyWageFen(p)
  if (daily <= 0) return now
  const d = new Date(now)
  let left = remainingFen
  let guard = 0
  while (left > 0 && guard < 400) {
    guard++
    d.setDate(d.getDate() + 1)
    if (isWorkday(d, p)) left -= daily
  }
  return d
}

/** 默认档案（onboarding 默认值） */
export function defaultProfile(): UserProfile {
  return {
    monthlySalaryFen: 0,
    salaryType: 'post_tax',
    workingDaysPerMonth: 22,
    segments: [
      { start: '09:00', end: '12:00' },
      { start: '13:30', end: '18:00' },
    ],
    workWeekdays: [1, 2, 3, 4, 5],
  }
}
