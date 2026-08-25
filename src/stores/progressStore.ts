import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DailyRecord } from '../types'
import { dateStr } from '../utils/format'

interface ProgressState {
  records: Record<string, DailyRecord>
  totalFishMinutes: number
  unlocked: Record<string, number>
  lastLevel: number
  fishSessionStart: number | null

  syncFromSnapshot: (now: Date, snap: { workedSeconds: number; earnedFen: number; state: string }) => void
  unlock: (id: string) => void
  setLevel: (lv: number) => void
  startFish: (now: number) => void
  endFish: (now: number) => void
  clearAll: () => void
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      records: {},
      totalFishMinutes: 0,
      unlocked: {},
      lastLevel: 1,
      fishSessionStart: null,

      syncFromSnapshot: (now, snap) => {
        const ds = dateStr(now)
        const workedMinutes = Math.floor(snap.workedSeconds / 60)
        const earnedFen = Math.round(snap.earnedFen)
        const completed = snap.state === 'after'
        const rec: DailyRecord = {
          date: ds,
          workedMinutes,
          earnedFen,
          completed,
          onTimeLeave: completed,
        }
        set((s) => ({ records: { ...s.records, [ds]: rec } }))
      },

      unlock: (id) => {
        if (get().unlocked[id]) return
        set((s) => ({ unlocked: { ...s.unlocked, [id]: Date.now() } }))
      },

      setLevel: (lv) => set({ lastLevel: lv }),

      startFish: (now) => {
        if (get().fishSessionStart) return
        set({ fishSessionStart: now })
      },

      endFish: (now) => {
        const start = get().fishSessionStart
        if (!start) return
        const mins = Math.round((now - start) / 60000)
        set((s) => ({
          fishSessionStart: null,
          totalFishMinutes: s.totalFishMinutes + mins,
        }))
      },

      clearAll: () =>
        set({ records: {}, totalFishMinutes: 0, unlocked: {}, lastLevel: 1, fishSessionStart: null }),
    }),
    {
      name: 'zyx-progress',
      partialize: (s) => ({
        records: s.records,
        totalFishMinutes: s.totalFishMinutes,
        unlocked: s.unlocked,
        lastLevel: s.lastLevel,
      }),
    }
  )
)
