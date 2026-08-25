import { useEffect, useState } from 'react'
import MainApp from './pages/MainApp'
import WidgetApp from './widget/WidgetApp'
import { initWindowLabel } from './services/tauri'
import { useThemeStore } from './stores/themeStore'

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

  if (label === 'widget') return <WidgetApp />
  return <MainApp />
}
