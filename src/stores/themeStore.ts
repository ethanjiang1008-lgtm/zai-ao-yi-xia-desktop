import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeId } from '../types'

interface ThemeState {
  theme: ThemeId
  animations: boolean
  setTheme: (t: ThemeId) => void
  setAnimations: (b: boolean) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'midnight',
      animations: true,
      setTheme: (theme) => set({ theme }),
      setAnimations: (animations) => set({ animations }),
    }),
    { name: 'fish-theme' }
  )
)
