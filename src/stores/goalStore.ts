import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Goal, GoalCategory } from '../types'
import { uid } from '../utils/format'

interface GoalState {
  goals: Goal[]
  addGoal: (g: {
    name: string
    priceFen: number
    emoji: string
    category: GoalCategory
    priority: number
    baselineEarnedFen: number
  }) => void
  updateGoal: (id: string, patch: Partial<Goal>) => void
  removeGoal: (id: string) => void
  setCurrent: (id: string) => void
  /** 返回刚完成的目标（若有），并自动切换下一个当前目标 */
  checkCompletion: (totalEarnedFen: number) => Goal | null
  clearAll: () => void
}

const CAT_EMOJI: Record<GoalCategory, string> = {
  数码: '🎧',
  美食: '🍔',
  旅行: '✈️',
  生活: '🏠',
  学习: '📚',
  其他: '🎁',
}

export function categoryEmoji(c: GoalCategory): string {
  return CAT_EMOJI[c] || '🎁'
}

export const useGoalStore = create<GoalState>()(
  persist(
    (set, get) => ({
      goals: [],
      addGoal: (g) =>
        set((s) => {
          const goal: Goal = {
            id: uid(),
            name: g.name,
            priceFen: g.priceFen,
            emoji: g.emoji || CAT_EMOJI[g.category],
            category: g.category,
            priority: g.priority,
            isCurrent: s.goals.every((x) => !x.isCurrent),
            createdAt: Date.now(),
            completedAt: null,
            baselineEarnedFen: g.baselineEarnedFen,
            status: 'active',
          }
          return { goals: [...s.goals, goal] }
        }),
      updateGoal: (id, patch) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),
      removeGoal: (id) =>
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
      setCurrent: (id) =>
        set((s) => ({
          goals: s.goals.map((g) => ({ ...g, isCurrent: g.id === id })),
        })),
      checkCompletion: (totalEarnedFen) => {
        const goals = get().goals
        const current = goals.find((g) => g.isCurrent && g.status === 'active')
        if (!current) return null
        const progress = totalEarnedFen - current.baselineEarnedFen
        if (progress < current.priceFen) return null
        const completed: Goal = {
          ...current,
          status: 'completed',
          completedAt: Date.now(),
        }
        // 切换到下一个优先级最高的 active 目标为当前
        const remaining = goals
          .filter((g) => g.id !== current.id && g.status === 'active')
          .sort((a, b) => a.priority - b.priority)
        const nextCurrent = remaining[0]
        const updated = goals.map((g) => {
          if (g.id === current.id) return completed
          if (nextCurrent && g.id === nextCurrent.id) return { ...g, isCurrent: true }
          return { ...g, isCurrent: false }
        })
        set({ goals: updated })
        return completed
      },
      clearAll: () => set({ goals: [] }),
    }),
    { name: 'fish-goals' }
  )
)

/** 计算目标进度信息 */
export function goalProgress(g: Goal, totalEarnedFen: number) {
  const earned = Math.max(0, totalEarnedFen - g.baselineEarnedFen)
  const price = g.priceFen
  const progress = price > 0 ? Math.min(1, earned / price) : 0
  const remaining = Math.max(0, price - earned)
  return { earned, price, progress, remaining }
}
