import { dateStr, fmtMinHM, hashCode } from '../utils/format'
import type { TodaySnapshot } from './TimeService'

/** 打工搭子会说什么（需求第二十四节） */
export function companionMessage(
  now: Date,
  snap: TodaySnapshot | null,
  earnedLabel: string
): string {
  if (!snap) return '再熬一下。'
  const seedKey = 'companion-' + dateStr(now) + snap.state
  const lines: string[] = []
  if (snap.state === 'offday') {
    lines.push('今天休息，别想工资了。')
    lines.push('休息日，搭子也放假。')
  } else if (snap.state === 'before') {
    lines.push('还没开始呢，先喝口水吧。')
    lines.push('新的一天，加油熬。')
  } else if (snap.state === 'after') {
    lines.push('下班见，今天也活下来了。')
    lines.push('辛苦了，早点回家。')
  } else if (snap.state === 'break') {
    lines.push('午休中，吃点好的。')
    lines.push('好好休息，下午再熬。')
  } else {
    const minsToOff = Math.floor(snap.secondsToOff / 60)
    lines.push(`还有 ${fmtMinHM(minsToOff)}。`)
    lines.push(`今天已经赚 ${earnedLabel} 了。`)
    lines.push('喝口水吧。')
    lines.push('再熬一下。')
    if (minsToOff > 0) lines.push(`再坚持 ${fmtMinHM(Math.min(minsToOff, 23))}。`)
  }
  let h = hashCode(seedKey)
  const idx = Math.abs(h) % lines.length
  return lines[idx]
}
