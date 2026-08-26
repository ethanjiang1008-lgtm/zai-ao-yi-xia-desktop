import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile } from '../types'
import { defaultProfile } from '../services/TimeService'

interface UserState {
  onboarded: boolean
  profile: UserProfile | null
  setProfile: (p: UserProfile) => void
  updateProfile: (patch: Partial<UserProfile>) => void
  completeOnboarding: (p: UserProfile) => void
  reset: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      onboarded: false,
      profile: null,
      setProfile: (p) => set({ profile: p }),
      updateProfile: (patch) => {
        const cur = get().profile
        if (cur) set({ profile: { ...cur, ...patch } })
      },
      completeOnboarding: (p) => set({ profile: p, onboarded: true }),
      reset: () => set({ profile: null, onboarded: false }),
    }),
    { name: 'fish-user' }
  )
)

export function loadDefaultProfile(): UserProfile {
  return defaultProfile()
}
