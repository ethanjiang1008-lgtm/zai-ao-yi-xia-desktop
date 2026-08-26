import { create } from 'zustand'

export interface FishState {
  isFishing: boolean
  startedAt: number | null
  /** 本次摸鱼秒数（仅当 isFishing 时由 tick 更新） */
  fishSeconds: number
  fishCostFen: number
  toggle: (perSecondFen: number) => void
  tick: (perSecondFen: number) => void
  endAndReport: () => { seconds: number; costFen: number } | null
}

export const useFishStore = create<FishState>((set, get) => ({
  isFishing: false,
  startedAt: null,
  fishSeconds: 0,
  fishCostFen: 0,

  toggle: (perSecondFen) => {
    const s = get()
    if (s.isFishing) {
      s.endAndReport()
      return
    }
    set({ isFishing: true, startedAt: Date.now(), fishSeconds: 0, fishCostFen: 0 })
  },

  tick: (perSecondFen) => {
    const s = get()
    if (!s.isFishing || !s.startedAt) return
    const seconds = Math.floor((Date.now() - s.startedAt) / 1000)
    const cost = Math.round(seconds * perSecondFen)
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
