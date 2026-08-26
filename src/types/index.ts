// 核心数据结构

export interface WorkSegment {
  start: string // "HH:mm"
  end: string // "HH:mm"
}

export type SalaryType = 'pre_tax' | 'post_tax'

export interface UserProfile {
  monthlySalaryFen: number // 月薪，分
  salaryType: SalaryType
  workingDaysPerMonth: number // 每月工作日
  segments: WorkSegment[] // 工作时间段（支持多段，含午休拆分）
  workWeekdays: number[] // 工作日，1=周一…7=周日
}

export type GoalCategory = '数码' | '美食' | '旅行' | '生活' | '学习' | '其他'

export interface Goal {
  id: string
  name: string
  priceFen: number
  emoji: string
  category: GoalCategory
  priority: number
  isCurrent: boolean
  createdAt: number
  completedAt: number | null
  baselineEarnedFen: number
  status: 'active' | 'completed'
}

export type AchievementCategory = 'basic' | 'cumulative' | 'fun' | 'special'

export interface AchievementDef {
  id: string
  title: string
  description: string
  icon: string
  category: AchievementCategory
  check: (s: Stats) => boolean
}

export interface DailyRecord {
  date: string
  workedMinutes: number
  earnedFen: number
  completed: boolean
  onTimeLeave: boolean
}

export interface Stats {
  totalWorkMinutes: number
  totalEarnedFen: number
  totalFishMinutes: number
  workdayCount: number
  consecutiveDays: number
  onTimeStreak: number
  mondaysCompleted: number
  monthEndAlive: boolean
  goalsCompleted: number
}

export type WidgetSize = 'S' | 'M' | 'L'

export type MoodId = 'great' | 'good' | 'okay' | 'low' | 'tired'

export type WidgetModuleId =
  | 'salary'
  | 'progress'
  | 'countdown'
  | 'goal'
  | 'level'
  | 'xp'
  | 'quote'
  | 'fish'
  | 'status'
  | 'mood'

export interface ToastEvent {
  id: string
  kind: 'achievement' | 'levelup' | 'goal' | 'reminder' | 'info'
  icon: string
  title: string
  desc: string
}

export type ThemeId = 'midnight' | 'mint' | 'sakura' | 'sunset' | 'cyber'

export interface ReminderConfig {
  enabled: boolean
  startTime: string
  endTime: string
  intervalMinutes: number
  workdaysOnly: boolean
}

export interface ReminderSet {
  water: ReminderConfig
  stand: ReminderConfig
}
