import { useEffect, useState } from 'react'
import MainApp from './pages/MainApp'
import WidgetApp from './widget/WidgetApp'
import { initWindowLabel, tauriInvoke, tauriListen } from './services/tauri'
import { useThemeStore } from './stores/themeStore'
import { useWidgetStore } from './stores/widgetStore'
import { useUserStore } from './stores/userStore'
import { useGoalStore } from './stores/goalStore'
import { useProgressStore } from './stores/progressStore'
import { useFishStore } from './stores/fishStore'
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

  // 主窗口修改主题后，广播给 widget
  useEffect(() => {
    if (label === 'main') {
      void tauriInvoke('broadcast_theme', { theme })
    }
  }, [theme, label])

  // 两个窗口都监听 'theme-changed'（保险：main 也监听，处理极少见的主窗口初次加载时主题不一致）
  useEffect(() => {
    let un: (() => void) | undefined
    void tauriListen('theme-changed', (payload) => {
      if (payload && typeof payload === 'string') {
        useThemeStore.getState().setTheme(payload as any)
      }
    }).then((u) => {
      un = u
    })
    return () => {
      if (un) un()
    }
  }, [])

  // 两个窗口都监听 'fish-changed'：同步鱼状态 + 记录 progress
  // 设计：发起方不再直接调 progressStore.startFish/endFish，统一由 listener 处理（双方都收到广播，避免重复记录）
  useEffect(() => {
    let un: (() => void) | undefined
    void tauriListen('fish-changed', (payload: any) => {
      if (!payload) return
      const { isFishing, startedAt, endedAt } = payload
      if (isFishing && startedAt) {
        useFishStore.getState().syncFrom(true, startedAt)
        useProgressStore.getState().startFish(startedAt)
      } else if (endedAt) {
        useFishStore.getState().syncFrom(false, null)
        useProgressStore.getState().endFish(endedAt)
      }
    }).then((u) => {
      un = u
    })
    return () => {
      if (un) un()
    }
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
