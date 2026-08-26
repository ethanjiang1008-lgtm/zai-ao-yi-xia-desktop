import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WidgetModuleId, WidgetSize } from '../types'

interface WidgetState {
  size: WidgetSize
  opacity: number // 0.3 ~ 1
  alwaysOnTop: boolean
  showCompanion: boolean
  showQuote: boolean
  /** 悬浮窗字号（仅影响 widget 窗口） */
  fontSize: number
  /** 文案刷新间隔（分钟） */
  quoteInterval: number
  modules: WidgetModuleId[] // 启用并排序
  setSize: (s: WidgetSize) => void
  setOpacity: (n: number) => void
  setAlwaysOnTop: (b: boolean) => void
  setFontSize: (n: number) => void
  setQuoteInterval: (n: number) => void
  toggleModule: (m: WidgetModuleId) => void
  moveModule: (m: WidgetModuleId, dir: -1 | 1) => void
  setModules: (mods: WidgetModuleId[]) => void
  toggleCompanion: () => void
  toggleQuote: () => void
}

const DEFAULT_MODULES: WidgetModuleId[] = [
  'salary',
  'progress',
  'countdown',
  'goal',
  'level',
  'mood',
  'fish',
  'status',
  'xp',
  'quote',
  'companion',
]

export const MODULE_LABELS: Record<WidgetModuleId, string> = {
  salary: '今日收入',
  progress: '今日进度',
  countdown: '下班倒计时',
  goal: '当前目标',
  level: '社畜等级',
  xp: 'XP 进度',
  quote: '今日文案',
  companion: '搭子',
  fish: '摸鱼计时',
  status: '今日状态',
  mood: '今日心情',
}

/** 尺寸配置：模块上限 + 窗口尺寸 + 描述 */
export interface SizeConfig {
  id: WidgetSize
  label: string
  desc: string
  /** 该尺寸下默认/最大显示的模块数（salary 永远算 1） */
  maxModules: number
  /** 窗口逻辑宽高（px） */
  w: number
  h: number
}

export const SIZE_CONFIG: Record<WidgetSize, SizeConfig> = {
  S: { id: 'S', label: 'S 极简', desc: '只看收入', maxModules: 2, w: 200, h: 110 },
  M: { id: 'M', label: 'M 标准', desc: '收入+进度+下班', maxModules: 5, w: 290, h: 220 },
  L: { id: 'L', label: 'L 详细', desc: '全部模块', maxModules: 11, w: 330, h: 460 },
}

/** 当前尺寸下应该显示的模块（超出上限时取前 maxModules 个） */
export function modulesForSize(modules: WidgetModuleId[], size: WidgetSize): WidgetModuleId[] {
  const cap = SIZE_CONFIG[size].maxModules
  return modules.slice(0, cap)
}

export const useWidgetStore = create<WidgetState>()(
  persist(
    (set, get) => ({
      size: 'M',
      opacity: 1,
      alwaysOnTop: true,
      showCompanion: true,
      showQuote: true,
      fontSize: 13,
      quoteInterval: 3,
      modules: DEFAULT_MODULES,
      setSize: (size) => set({ size }),
      setOpacity: (opacity) => set({ opacity: Math.max(0.3, Math.min(1, opacity)) }),
      setAlwaysOnTop: (alwaysOnTop) => set({ alwaysOnTop }),
      setFontSize: (fontSize) => set({ fontSize: Math.max(11, Math.min(18, fontSize)) }),
      setQuoteInterval: (n) => set({ quoteInterval: Math.max(1, Math.min(60, n)) }),
      toggleModule: (m) =>
        set((s) => {
          const has = s.modules.includes(m)
          if (has) return { modules: s.modules.filter((x) => x !== m) }
          // 启用时检查上限
          const cap = SIZE_CONFIG[s.size].maxModules
          if (s.modules.length >= cap) return s // 超过当前尺寸上限，不允许启用
          return { modules: [...s.modules, m] }
        }),
      moveModule: (m, dir) =>
        set((s) => {
          const idx = s.modules.indexOf(m)
          if (idx < 0) return s
          const next = idx + dir
          if (next < 0 || next >= s.modules.length) return s
          const arr = [...s.modules]
          ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
          return { modules: arr }
        }),
      setModules: (mods) => set({ modules: mods }),
      toggleCompanion: () => set((s) => ({ showCompanion: !s.showCompanion })),
      toggleQuote: () => set((s) => ({ showQuote: !s.showQuote })),
    }),
    {
      name: 'fish-widget',
      version: 3,
      migrate: (persistedState: any, fromVersion: number) => {
        // v0.2.2 → v0.2.3: 移除已下线的 'weather' 模块（兼容老存档）
        if (persistedState && Array.isArray(persistedState.modules)) {
          persistedState.modules = (persistedState.modules as string[]).filter(
            (m) => m !== 'weather'
          ) as WidgetModuleId[]
        }
        return persistedState
      },
    }
  )
)
