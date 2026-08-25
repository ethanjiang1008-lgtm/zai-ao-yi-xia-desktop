import type { Stats } from '../types'
import { useProgressStore } from '../stores/progressStore'
import { useGoalStore } from '../stores/goalStore'
import { useToastStore } from '../stores/toastStore'
import { useUserStore } from '../stores/userStore'
import { isWorkday } from './TimeService'
import { ACHIEVEMENTS } from '../constants/achievements'
import { levelXpInfo, titleForLevel } from '../constants/levels'
import { dateStr } from '../utils/format'
import { tauriInvoke } from './tauri'

let lastMinuteKey = -1
let lastTrayMs = 0

/** 从历史记录推导全局统计（连续天数/准时下班/周一等从 records 计算） */
export function collectStats(): Stats {
  const { records, totalFishMinutes } = useProgressStore.getState()
  const goalsCompleted = useGoalStore.getState().goals.filter((g) => g.status === 'completed').length
  const profile = useUserStore.getState().profile

  const recs = Object.values(records).sort((a, b) => a.date.localeCompare(b.date))
  const totalWorkMinutes = recs.reduce((a, r) => a + r.workedMinutes, 0)
  const totalEarnedFen = recs.reduce((a, r) => a + r.earnedFen, 0)
  const workdayCount = recs.length

  // 连续工作日：从最近一天往前回溯（跳过非工作日）
  let consecutiveDays = 0
  let onTimeStreak = 0
  if (recs.length > 0 && profile) {
    let d = new Date()
    // 如果今天还没完成记录，从昨天开始算
    const todayStr = dateStr(d)
    const lastRec = recs[recs.length - 1]
    if (lastRec.date !== todayStr) {
      d.setDate(d.getDate() - 1)
    }
    for (let i = 0; i < 400; i++) {
      const ds = dateStr(d)
      const r = records[ds]
      if (r) {
        if (r.completed) consecutiveDays++
        if (r.completed && r.onTimeLeave) onTimeStreak++
        d.setDate(d.getDate() - 1)
      } else if (profile && !isWorkday(d, profile)) {
        d.setDate(d.getDate() - 1)
      } else {
        break
      }
    }
  }

  // 周一完成数
  let mondaysCompleted = 0
  let monthEndAlive = false
  for (const r of recs) {
    const dt = new Date(r.date + 'T00:00:00')
    if (r.completed && dt.getDay() === 1) mondaysCompleted++
    if (r.completed && dt.getDate() >= 25) monthEndAlive = true
  }

  return {
    totalWorkMinutes,
    totalEarnedFen,
    totalFishMinutes,
    workdayCount,
    consecutiveDays,
    onTimeStreak,
    mondaysCompleted,
    monthEndAlive,
    goalsCompleted,
  }
}

export interface EngineTickSnap {
  workedSeconds: number
  earnedFen: number
  state: string
}

/** 每秒调用；内部按分钟节流执行重计算 */
export function engineTick(now: Date, snap: EngineTickSnap | null): void {
  if (!snap) return
  const minuteKey = Math.floor(now.getTime() / 60000)

  if (minuteKey !== lastMinuteKey) {
    lastMinuteKey = minuteKey
    const prog = useProgressStore.getState()
    prog.syncFromSnapshot(now, snap)

    const stats = collectStats()
    const newly = ACHIEVEMENTS.filter((a) => !prog.unlocked[a.id] && a.check(stats))
    for (const a of newly) {
      prog.unlock(a.id)
      useToastStore.getState().push({
        kind: 'achievement',
        icon: a.icon,
        title: `成就解锁：${a.title}`,
        desc: a.description,
      })
    }

    // 等级检测
    const info = levelXpInfo(stats.totalWorkMinutes)
    if (info.level > prog.lastLevel) {
      prog.setLevel(info.level)
      useToastStore.getState().push({
        kind: 'levelup',
        icon: '⭐',
        title: `LEVEL UP！Lv.${info.level} ${titleForLevel(info.level)}`,
        desc: '工作时间就是 XP，你又老了一级。',
      })
    }

    // 目标完成检测
    const completed = useGoalStore.getState().checkCompletion(stats.totalEarnedFen)
    if (completed) {
      useToastStore.getState().push({
        kind: 'goal',
        icon: completed.emoji,
        title: `🎉 目标达成：${completed.name}`,
        desc: `已加入「我的收藏」`,
      })
    }
  }

  // 托盘文字更新（节流 30s）
  if (now.getTime() - lastTrayMs > 30000) {
    lastTrayMs = now.getTime()
    void tauriInvoke('update_tray_earnings', {
      text: `今日 ¥${(snap.earnedFen / 100).toFixed(2)}`,
    })
  }
}

export function resetEngineThrottle() {
  lastMinuteKey = -1
  lastTrayMs = 0
}
