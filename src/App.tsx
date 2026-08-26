import { useEffect, useState } from 'react'
import MainApp from './pages/MainApp'
import WidgetApp from './widget/WidgetApp'
import { initWindowLabel } from './services/tauri'
import { useThemeStore } from './stores/themeStore'
import { useWidgetStore } from './stores/widgetStore'
import { useUserStore } from './stores/userStore'
import { useGoalStore } from './stores/goalStore'
import { useProgressStore } from './stores/progressStore'
import { useMoodStore } from './stores/moodStore'
import { useReminderStore } from './stores/reminderStore'
import { startReminderLoop, stopReminderLoop } from './services/reminders'

export default function App() {
  const [label, setLabel] = useState<string>('main')
  const theme = useThemeStore((s) => s.theme)
  const animations = useThemeStore((s) => s.animations)
  const widgetFontSize = useWidgetStore((s) => s.fontSize)

  useEffect(() => {
    void initWindowLabel().then((l) => setLabel(l))
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    if (label === 'widget') {
      root.style.fontSize = `${widgetFontSize}px`
    } else {
      root.style.fontSize = ''
    }
    if (animations) root.classList.remove('no-anim')
    else root.classList.add('no-anim')
  }, [theme, widgetFontSize, animations, label])

  useEffect(() => {
    if (label === 'widget') document.body.classList.add('widget-body')
    else document.body.classList.remove('widget-body')
  }, [label])

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === null) {
        useWidgetStore.persist?.rehydrate?.()
        useThemeStore.persist?.rehydrate?.()
        useUserStore.persist?.rehydrate?.()
        useGoalStore.persist?.rehydrate?.()
        useProgressStore.persist?.rehydrate?.()
        useMoodStore.persist?.rehydrate?.()
        useReminderStore.persist?.rehydrate?.()
        return
      }
      switch (e.key) {
        case 'fish-widget': useWidgetStore.persist?.rehydrate?.(); break
        case 'fish-theme': useThemeStore.persist?.rehydrate?.(); break
        case 'fish-user': useUserStore.persist?.rehydrate?.(); break
        case 'fish-goals': useGoalStore.persist?.rehydrate?.(); break
        case 'fish-progress': useProgressStore.persist?.rehydrate?.(); break
        case 'fish-mood': useMoodStore.persist?.rehydrate?.(); break
        case 'fish-reminder': useReminderStore.persist?.rehydrate?.(); break
        // 兼容旧 key：老用户升级后仍能同步
        case 'zyx-widget': useWidgetStore.persist?.rehydrate?.(); break
        case 'zyx-theme': useThemeStore.persist?.rehydrate?.(); break
        case 'zyx-user': useUserStore.persist?.rehydrate?.(); break
        case 'zyx-goals': useGoalStore.persist?.rehydrate?.(); break
        case 'zyx-progress': useProgressStore.persist?.rehydrate?.(); break
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  useEffect(() => {
    if (label === 'main') {
      startReminderLoop()
      return () => stopReminderLoop()
    }
  }, [label])

  if (label === 'widget') return <WidgetApp />
  return <MainApp />
}
