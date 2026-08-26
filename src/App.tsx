import { useEffect, useState } from 'react'
import MainApp from './pages/MainApp'
import WidgetApp from './widget/WidgetApp'
import { initWindowLabel } from './services/tauri'
import { useThemeStore } from './stores/themeStore'
import { useWidgetStore } from './stores/widgetStore'
import { useUserStore } from './stores/userStore'
import { useGoalStore } from './stores/goalStore'
import { useProgressStore } from './stores/progressStore'
import { useWeatherStore } from './stores/weatherStore'
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

  // 主题应用；字号仅在悬浮窗生效
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

  // widget 窗口用透明 body
  useEffect(() => {
    if (label === 'widget') document.body.classList.add('widget-body')
    else document.body.classList.remove('widget-body')
  }, [label])

  // 跨窗口 store 同步：主窗口改设置时，widget 窗口通过 storage 事件感知
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === null) {
        useWidgetStore.persist?.rehydrate?.()
        useThemeStore.persist?.rehydrate?.()
        useUserStore.persist?.rehydrate?.()
        useGoalStore.persist?.rehydrate?.()
        useProgressStore.persist?.rehydrate?.()
        useWeatherStore.persist?.rehydrate?.()
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
        case 'fish-weather': useWeatherStore.persist?.rehydrate?.(); break
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

  // 主窗口启动时启动提醒循环
  useEffect(() => {
    if (label === 'main') {
      startReminderLoop()
      return () => stopReminderLoop()
    }
  }, [label])

  if (label === 'widget') return <WidgetApp />
  return <MainApp />
}
