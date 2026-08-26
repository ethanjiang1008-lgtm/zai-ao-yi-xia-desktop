import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MoodId } from '../types'
import { dateStr } from '../utils/format'

interface MoodState {
  /** 每日心情：key = YYYY-MM-DD */
  daily: Record<string, MoodId>
  setToday: (m: MoodId) => void
  setFor: (date: string, m: MoodId) => void
  getFor: (date: string) => MoodId | null
}

export const MOOD_META: Record<MoodId, { label: string; emoji: string }> = {
  great: { label: '超棒', emoji: '🤩' },
  good: { label: '不错', emoji: '😊' },
  okay: { label: '一般', emoji: '😐' },
  low: { label: '低落', emoji: '😔' },
  tired: { label: '疲惫', emoji: '😴' },
}

export const MOOD_LIST: MoodId[] = ['great', 'good', 'okay', 'low', 'tired']

export const useMoodStore = create<MoodState>()(
  persist(
    (set, get) => ({
      daily: {},
      setToday: (m) => {
        const key = dateStr(new Date())
        set((s) => ({ daily: { ...s.daily, [key]: m } }))
      },
      setFor: (date, m) => set((s) => ({ daily: { ...s.daily, [date]: m } })),
      getFor: (date) => get().daily[date] || null,
    }),
    { name: 'fish-mood' }
  )
)
