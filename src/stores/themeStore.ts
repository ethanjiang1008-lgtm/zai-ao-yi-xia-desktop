import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeId } from '../types'

interface ThemeState {
  theme: ThemeId
  fontSize: number
  animations: boolean
  setTheme: (t: ThemeId) => void
  setFontSize: (n: number) => void
  setAnimations: (b: boolean) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'midnight',
      fontSize: 15,
      animations: true,
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setAnimations: (animations) => set({ animations }),
    }),
    { name: 'zyx-theme' }
  )
)
