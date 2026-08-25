import { create } from 'zustand'
import type { TodaySnapshot } from '../services/TimeService'

export interface FishState {
  isFishing: boolean
  startedAt: number | null
  /** 本次摸鱼秒数（仅当 isFishing 时由 tick 更新） */
  fishSeconds: number
  fishCostFen: number
  _snap: TodaySnapshot | null
  setSnap: (snap: TodaySnapshot | null) => void
  toggle: () => void
  tick: () => void
  endAndReport: () => { seconds: number; costFen: number } | null
}

export const useFishStore = create<FishState>((set, get) => ({
  isFishing: false,
  startedAt: null,
  fishSeconds: 0,
  fishCostFen: 0,
  _snap: null,

  setSnap: (snap) => {
    set({ _snap: snap })
    if (get().isFishing) get().tick()
  },

  toggle: () => {
    const s = get()
    if (s.isFishing) {
      // 结束
      const report = s.endAndReport()
      return report ? undefined : undefined
    }
    set({ isFishing: true, startedAt: Date.now(), fishSeconds: 0, fishCostFen: 0 })
  },

  tick: () => {
    const s = get()
    if (!s.isFishing || !s.startedAt) return
    const seconds = Math.floor((Date.now() - s.startedAt) / 1000)
    const cost = s._snap ? Math.round(seconds * s._snap.perSecondFen) : 0
    set({ fishSeconds: seconds, fishCostFen: cost })
  },

  endAndReport: () => {
    const s = get()
    if (!s.isFishing) return null
    const report = { seconds: s.fishSeconds, costFen: s.fishCostFen }
    set({ isFishing: false, startedAt: null, fishSeconds: 0, fishCostFen: 0 })
    return report
  },
}))
