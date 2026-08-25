import type { AchievementDef } from '../types'

// 社畜图鉴成就定义（需求第十九、二十节），文案带幽默感
export const ACHIEVEMENTS: AchievementDef[] = [
  // 基础
  {
    id: 'first100',
    title: '第一桶社畜金',
    description: '第一次赚到 ¥100。',
    icon: '💰',
    category: 'basic',
    check: (s) => s.totalEarnedFen >= 10000,
  },
  {
    id: 'first1h',
    title: '热身完毕',
    description: '第一次工作满 1 小时。',
    icon: '⏱️',
    category: 'basic',
    check: (s) => s.totalWorkMinutes >= 60,
  },
  {
    id: 'firstOntime',
    title: '准时跑路',
    description: '第一次准时下班。',
    icon: '🏃',
    category: 'basic',
    check: (s) => s.onTimeStreak >= 1,
  },
  // 累计
  {
    id: 'work100h',
    title: '百小时玩家',
    description: '累计工作 100 小时。',
    icon: '💼',
    category: 'cumulative',
    check: (s) => s.totalWorkMinutes >= 6000,
  },
  {
    id: 'work500h',
    title: '老油条',
    description: '累计工作 500 小时。',
    icon: '🥓',
    category: 'cumulative',
    check: (s) => s.totalWorkMinutes >= 30000,
  },
  {
    id: 'earn10k',
    title: '万元户',
    description: '累计赚到 ¥10,000。',
    icon: '💵',
    category: 'cumulative',
    check: (s) => s.totalEarnedFen >= 1000000,
  },
  {
    id: 'earn100k',
    title: '六位数打工人',
    description: '累计赚到 ¥100,000。',
    icon: '🏦',
    category: 'cumulative',
    check: (s) => s.totalEarnedFen >= 10000000,
  },
  // 娱乐
  {
    id: 'days5',
    title: '精神状态良好',
    description: '连续 5 天工作。',
    icon: '🧠',
    category: 'fun',
    check: (s) => s.consecutiveDays >= 5,
  },
  {
    id: 'ontime7',
    title: '到点就走',
    description: '连续 7 天准时下班。',
    icon: '🚪',
    category: 'fun',
    check: (s) => s.onTimeStreak >= 7,
  },
  {
    id: 'fish10h',
    title: '摸鱼学徒',
    description: '累计摸鱼 10 小时。',
    icon: '🐟',
    category: 'fun',
    check: (s) => s.totalFishMinutes >= 600,
  },
  {
    id: 'fish100h',
    title: '摸鱼宗师',
    description: '累计摸鱼 100 小时。',
    icon: '🎣',
    category: 'fun',
    check: (s) => s.totalFishMinutes >= 6000,
  },
  // 特殊
  {
    id: 'monday20',
    title: '周一幸存者',
    description: '完成 20 个周一。',
    icon: '📅',
    category: 'special',
    check: (s) => s.mondaysCompleted >= 20,
  },
  {
    id: 'monthEnd',
    title: '月底仍然活着',
    description: '在月底依然打卡上班。',
    icon: '🌗',
    category: 'special',
    check: (s) => s.monthEndAlive,
  },
  {
    id: 'goal1',
    title: '愿望实现家',
    description: '完成第一个目标。',
    icon: '🎯',
    category: 'special',
    check: (s) => s.goalsCompleted >= 1,
  },
  {
    id: 'goal5',
    title: '打工博物馆馆长',
    description: '完成 5 个目标。',
    icon: '🏛️',
    category: 'special',
    check: (s) => s.goalsCompleted >= 5,
  },
]

export const ACHIEVEMENT_CATEGORY_LABEL: Record<string, string> = {
  basic: '基础',
  cumulative: '累计',
  fun: '娱乐',
  special: '特殊',
}
