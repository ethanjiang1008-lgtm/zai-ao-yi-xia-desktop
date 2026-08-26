// 喝水/站立提醒：主窗口 setInterval 调度，通过 Rust 命令发 OS 通知
import { useReminderStore } from '../stores/reminderStore'
import { useUserStore } from '../stores/userStore'
import { tauriInvoke, isTauri } from './tauri'
import { useToastStore } from '../stores/toastStore'
import { isWorkday } from './TimeService'
import { hhmmToMin } from '../utils/format'

let loopTimer: number | null = null
let lastWaterKey = '' // YYYY-MM-DD-HH-MM
let lastStandKey = ''

function isInWindow(now: Date, startHHMM: string, endHHMM: string): boolean {
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const a = hhmmToMin(startHHMM)
  const b = hhmmToMin(endHHMM)
  return nowMin >= a && nowMin <= b
}

function minuteKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`
}

async function fireNotification(title: string, body: string, kind: 'reminder'): Promise<void> {
  // 1) 站内 toast（总是有）
  useToastStore.getState().push({
    kind: 'reminder',
    icon: kind === 'reminder' ? '🔔' : '🔔',
    title,
    desc: body,
  })
  // 2) OS 通知（Tauri 环境）
  if (isTauri) {
    await tauriInvoke('show_notification', { title, body })
  }
}

function checkAndFire(): void {
  const store = useReminderStore.getState()
  const profile = useUserStore.getState().profile
  const now = new Date()
  const workdayOk = !store.water.workdaysOnly || (profile && isWorkday(now, profile))
  if (!workdayOk) return

  const key = minuteKey(now)

  // 喝水
  if (store.water.enabled && isInWindow(now, store.water.startTime, store.water.endTime)) {
    if (key !== lastWaterKey && now.getMinutes() % Math.max(1, store.water.intervalMinutes) === 0) {
      lastWaterKey = key
      void fireNotification('💧 该喝水了', '起身去倒杯水，保护一下打工人的肾脏。', 'reminder')
    }
  }
  // 站立
  if (store.stand.enabled && isInWindow(now, store.stand.startTime, store.stand.endTime)) {
    if (key !== lastStandKey && now.getMinutes() % Math.max(1, store.stand.intervalMinutes) === 0) {
      lastStandKey = key
      void fireNotification('🧍 起来站一下', '离开椅子，伸个懒腰，眼睛看看远处。', 'reminder')
    }
  }
}

export function startReminderLoop(): void {
  if (loopTimer !== null) return
  // 启动时立即跑一次（避免刚开 app 就错过整点）
  checkAndFire()
  loopTimer = window.setInterval(checkAndFire, 30 * 1000) // 每 30s 检查
}

export function stopReminderLoop(): void {
  if (loopTimer !== null) {
    clearInterval(loopTimer)
    loopTimer = null
  }
  lastWaterKey = ''
  lastStandKey = ''
}
