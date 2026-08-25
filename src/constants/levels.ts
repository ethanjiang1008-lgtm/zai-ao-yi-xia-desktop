import type { Stats } from '../types'

// 社畜等级（需求第十七节）+ XP 规则（第十八节：1分钟=1XP）
export const XP_PER_LEVEL = 300

export const LEVEL_TITLES: { minLevel: number; title: string }[] = [
  { minLevel: 1, title: '职场萌新' },
  { minLevel: 5, title: '打工新人' },
  { minLevel: 10, title: '熟练工' },
  { minLevel: 20, title: '老油条' },
  { minLevel: 30, title: '资深社畜' },
  { minLevel: 40, title: '卷王' },
  { minLevel: 50, title: '打工皇帝' },
  { minLevel: 60, title: '资本主义幸存者' },
  { minLevel: 99, title: '灵魂已下班' },
]

export function xpToLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1
}

export function levelXpInfo(xp: number): {
  level: number
  title: string
  currentXp: number
  needXp: number
  progress: number
} {
  const level = xpToLevel(xp)
  const currentXp = xp % XP_PER_LEVEL
  return {
    level,
    title: titleForLevel(level),
    currentXp,
    needXp: XP_PER_LEVEL,
    progress: currentXp / XP_PER_LEVEL,
  }
}

export function titleForLevel(level: number): string {
  let title = LEVEL_TITLES[0].title
  for (const t of LEVEL_TITLES) {
    if (level >= t.minLevel) title = t.title
  }
  return title
}

export type LevelInfo = ReturnType<typeof levelXpInfo>

// 默认摘要统计（空状态）
export const emptyStats: Stats = {
  totalWorkMinutes: 0,
  totalEarnedFen: 0,
  totalFishMinutes: 0,
  workdayCount: 0,
  consecutiveDays: 0,
  onTimeStreak: 0,
  mondaysCompleted: 0,
  monthEndAlive: false,
  goalsCompleted: 0,
}
