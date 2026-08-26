import { useWidgetStore, MODULE_LABELS } from '../stores/widgetStore'
import type { WidgetModuleId, WidgetSize } from '../types'
import { autostartEnable, autostartIsEnabled, setWidgetSize, setWidgetOnTop, isTauri } from '../services/tauri'
import { useEffect, useState } from 'react'
import WidgetApp from '../widget/WidgetApp'

const SIZES: { id: WidgetSize; label: string; w: number; h: number }[] = [
  { id: 'S', label: 'S 极简', w: 200, h: 120 },
  { id: 'M', label: 'M 标准', w: 280, h: 170 },
  { id: 'L', label: 'L 游戏', w: 340, h: 260 },
]

const ALL_MODULES: WidgetModuleId[] = ['salary', 'progress', 'countdown', 'goal', 'level', 'xp', 'quote', 'companion', 'fish', 'status']

export default function DesktopSettings() {
  const ws = useWidgetStore()
  const [autostart, setAutostartState] = useState(false)

  useEffect(() => {
    void autostartIsEnabled().then(setAutostartState)
  }, [])

  const handleSize = (s: WidgetSize, w: number, h: number) => {
    ws.setSize(s)
    void setWidgetSize(w, h)
  }

  const handleOnTop = (b: boolean) => {
    ws.setAlwaysOnTop(b)
    void setWidgetOnTop(b)
  }

  const handleAutostart = async (b: boolean) => {
    setAutostartState(b)
    await autostartEnable(b)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-5">🖥️ 桌面组件</h1>

      {/* 预览 */}
      <div className="card p-4 mb-5">
        <div className="label-dim text-xs mb-3">实时预览</div>
        <div className="flex justify-center py-4" style={{ background: 'var(--bar-track)', borderRadius: 12 }}>
          <div style={{ width: SIZES.find((s) => s.id === ws.size)?.w, transform: 'scale(0.85)', transformOrigin: 'center' }}>
            <WidgetApp previewMode />
          </div>
        </div>
      </div>

      {/* 尺寸 */}
      <div className="card p-4 mb-3">
        <div className="font-semibold text-sm mb-3">尺寸</div>
        <div className="flex gap-2">
          {SIZES.map((s) => (
            <button key={s.id} className={`btn flex-1 ${ws.size === s.id ? 'btn-primary' : ''}`} onClick={() => handleSize(s.id, s.w, s.h)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 透明度 + 置顶 + 开机启动 */}
      <div className="card p-4 mb-3 space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-semibold">透明度</span>
            <span className="label-dim text-sm">{Math.round(ws.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.3}
            max={1}
            step={0.05}
            value={ws.opacity}
            onChange={(e) => ws.setOpacity(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: 'var(--accent)' }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">始终置顶</span>
          <Toggle on={ws.alwaysOnTop} onChange={handleOnTop} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">开机启动</span>
          <Toggle on={autostart} onChange={handleAutostart} disabled={!isTauri} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">显示搭子</span>
          <Toggle on={ws.showCompanion} onChange={ws.toggleCompanion} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">显示文案</span>
          <Toggle on={ws.showQuote} onChange={ws.toggleQuote} />
        </div>
      </div>

      {/* 模块配置 */}
      <div className="card p-4">
        <div className="font-semibold text-sm mb-3">显示模块（可开关 · 排序）</div>
        <div className="space-y-1.5">
          {ALL_MODULES.map((m) => {
            const enabled = ws.modules.includes(m)
            const idx = ws.modules.indexOf(m)
            return (
              <div key={m} className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{ background: enabled ? 'var(--card)' : 'transparent' }}>
                <div className="flex items-center gap-3">
                  <Toggle on={enabled} onChange={() => ws.toggleModule(m)} />
                  <span className="text-sm">{MODULE_LABELS[m]}</span>
                </div>
                {enabled && (
                  <div className="flex gap-1">
                    <button className="btn btn-ghost text-xs px-2" disabled={idx === 0} onClick={() => ws.moveModule(m, -1)}>↑</button>
                    <button className="btn btn-ghost text-xs px-2" disabled={idx === ws.modules.length - 1} onClick={() => ws.moveModule(m, 1)}>↓</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (b: boolean) => void; disabled?: boolean }) {
  return (
    <button
      className="relative w-10 h-6 rounded-full transition-all"
      style={{ background: on ? 'var(--accent)' : 'var(--bar-track)', opacity: disabled ? 0.4 : 1 }}
      disabled={disabled}
      onClick={() => onChange(!on)}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
        style={{ left: on ? '18px' : '2px' }}
      />
    </button>
  )
}
