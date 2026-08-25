import { useEffect, useState } from 'react'
import Onboarding from './Onboarding'
import Today from './Today'
import Goals from './Goals'
import Achievements from './Achievements'
import DesktopSettings from './DesktopSettings'
import Settings from './Settings'
import { useUserStore } from '../stores/userStore'
import { useClock } from '../hooks/useClock'
import ToastLayer from '../components/ToastLayer'
import { tauriListen, isTauri } from '../services/tauri'
import { resetEngineThrottle } from '../services/engine'

type Tab = 'today' | 'goals' | 'achievements' | 'desktop' | 'settings'

const NAV: { id: Tab; icon: string; label: string }[] = [
  { id: 'today', icon: '☀️', label: '今日' },
  { id: 'goals', icon: '🎯', label: '目标' },
  { id: 'achievements', icon: '🏆', label: '成就' },
  { id: 'desktop', icon: '🖥️', label: '桌面' },
  { id: 'settings', icon: '⚙️', label: '设置' },
]

export default function MainApp() {
  const onboarded = useUserStore((s) => s.onboarded)
  const profile = useUserStore((s) => s.profile)
  const [tab, setTab] = useState<Tab>('today')
  const { now, snap } = useClock(profile)

  // 监听托盘导航事件
  useEffect(() => {
    if (!isTauri) return
    void tauriListen('navigate', (payload) => {
      const map: Record<string, Tab> = {
        goals: 'goals',
        settings: 'settings',
        today: 'today',
        desktop: 'desktop',
        achievements: 'achievements',
      }
      if (map[payload]) setTab(map[payload])
    })
    resetEngineThrottle()
  }, [])

  if (!onboarded || !profile) return <Onboarding />

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* 极简图标导航 */}
      <nav className="w-16 shrink-0 flex flex-col items-center gap-1 py-4 border-r" style={{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }}>
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`flex flex-col items-center gap-1 w-14 py-2 rounded-lg transition-all ${
              tab === n.id ? 'accent-grad text-white' : 'btn-ghost'
            }`}
            onClick={() => setTab(n.id)}
            data-nodrag
          >
            <span className="text-xl">{n.icon}</span>
            <span className="text-[10px] font-medium">{n.label}</span>
          </button>
        ))}
      </nav>

      {/* 内容区 */}
      <main className="flex-1 overflow-y-auto">
        {tab === 'today' && <Today now={now} snap={snap} />}
        {tab === 'goals' && <Goals snap={snap} />}
        {tab === 'achievements' && <Achievements />}
        {tab === 'desktop' && <DesktopSettings />}
        {tab === 'settings' && <Settings />}
      </main>

      <ToastLayer />
    </div>
  )
}
