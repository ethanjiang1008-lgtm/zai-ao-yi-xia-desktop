import { useEffect, useState } from 'react'
import MainApp from './pages/MainApp'
import WidgetApp from './widget/WidgetApp'
import { initWindowLabel } from './services/tauri'
import { useThemeStore } from './stores/themeStore'
import { useWidgetStore } from './stores/widgetStore'
import { useUserStore } from './stores/userStore'
import { useGoalStore } from './stores/goalStore'
import { useProgressStore } from './stores/progressStore'

export default function App() {
  const [label, setLabel] = useState<string>('main')
  const theme = useThemeStore((s) => s.theme)
  const fontSize = useThemeStore((s) => s.fontSize)
  const animations = useThemeStore((s) => s.animations)

  useEffect(() => {
    void initWindowLabel().then((l) => setLabel(l))
  }, [])

  // 主题应用
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    root.style.fontSize = `${fontSize}px`
    if (animations) root.classList.remove('no-anim')
    else root.classList.add('no-anim')
  }, [theme, fontSize, animations])

  // widget 窗口用透明 body
  useEffect(() => {
    if (label === 'widget') document.body.classList.add('widget-body')
    else document.body.classList.remove('widget-body')
  }, [label])

  // 跨窗口 store 同步：主窗口改设置时，widget 窗口通过 storage 事件感知
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === null) {
        // localStorage.clear()
        useWidgetStore.persist?.rehydrate?.()
        useThemeStore.persist?.rehydrate?.()
        useUserStore.persist?.rehydrate?.()
        useGoalStore.persist?.rehydrate?.()
        useProgressStore.persist?.rehydrate?.()
        return
      }
      switch (e.key) {
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

  if (label === 'widget') return <WidgetApp />
  return <MainApp />
}
