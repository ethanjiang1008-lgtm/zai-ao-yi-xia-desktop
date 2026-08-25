import { create } from 'zustand'
import type { ToastEvent } from '../types'
import { uid } from '../utils/format'

interface ToastState {
  toasts: ToastEvent[]
  push: (t: Omit<ToastEvent, 'id'>) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = uid()
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }))
    }, 5500)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))
