import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ReminderConfig, ReminderSet } from '../types'

const DEFAULT_WATER: ReminderConfig = {
  enabled: false,
  startTime: '09:00',
  endTime: '18:00',
  intervalMinutes: 60,
  workdaysOnly: true,
}

const DEFAULT_STAND: ReminderConfig = {
  enabled: false,
  startTime: '09:00',
  endTime: '18:00',
  intervalMinutes: 45,
  workdaysOnly: true,
}

interface ReminderState extends ReminderSet {
  setWater: (patch: Partial<ReminderConfig>) => void
  setStand: (patch: Partial<ReminderConfig>) => void
}

export const useReminderStore = create<ReminderState>()(
  persist(
    (set) => ({
      water: DEFAULT_WATER,
      stand: DEFAULT_STAND,
      setWater: (patch) => set((s) => ({ water: { ...s.water, ...patch } })),
      setStand: (patch) => set((s) => ({ stand: { ...s.stand, ...patch } })),
    }),
    { name: 'fish-reminder' }
  )
)
