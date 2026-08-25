import { dateStr, hashCode, mulberry32 } from '../utils/format'

const SPIRITS = ['灵魂离线中', '还能活', '勉强维持', '电量充足', '勉强算个人', '已习惯', '处于待机']

export interface TodayStatus {
  emoji: string
  statusLabel: string
  motivation: number // 工作动力 %
  survival: number // 存活概率 %
  socialValue: number // 社畜值
  spirit: string
}

export function getTodayStatus(d: Date): TodayStatus {
  const seed = hashCode('status-' + dateStr(d))
  const r = mulberry32(seed)
  const motivation = Math.round(20 + r() * 70)
  const survival = Math.round(60 + r() * 39)
  const socialValue = Math.round(30 + r() * 69)
  const spirit = SPIRITS[Math.floor(r() * SPIRITS.length)]
  const emoji = motivation < 40 ? '🫠' : motivation < 70 ? '😮‍💨' : '🙂'
  const statusLabel = spirit
  return { emoji, statusLabel, motivation, survival, socialValue, spirit }
}
