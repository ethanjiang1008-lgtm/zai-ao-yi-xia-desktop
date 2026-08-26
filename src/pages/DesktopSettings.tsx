import { useWidgetStore, MODULE_LABELS } from '../stores/widgetStore'
import type { WidgetModuleId, WidgetSize } from '../types'
import { autostartEnable, autostartIsEnabled, setWidgetSize, setWidgetOnTop, isTauri } from '../services/tauri'
import { useEffect, useState } from 'react'
import WidgetApp from '../widget/WidgetApp'
import { useMoodStore, MOOD_LIST, MOOD_META } from '../stores/moodStore'
import { useReminderStore } from '../stores/reminderStore'

const SIZES: { id: WidgetSize; label: string; w: number; h: number }[] = [
  { id: 'S', label: 'S 极简', w: 200, h: 130 },
  { id: 'M', label: 'M 标准', w: 300, h: 230 },
  { id: 'L', label: 'L 游戏', w: 340, h: 300 },
]

const ALL_MODULES: WidgetModuleId[] = [
  'salary',
  'progress',
  'countdown',
  'goal',
  'level',
  'xp',
  'mood',
  'fish',
  'status',
  'quote',
  'companion',
]

export default function DesktopSettings() {
  const ws = useWidgetStore()
  const [autostart, setAutostartState] = useState(false)

  const todayMood = useMoodStore((s) => s.daily[dateStr(new Date())]) ?? null
  const setTodayMood = useMoodStore((s) => s.setToday)
  const reminder = useReminderStore()

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

      {/* 外观 */}
      <div className="card p-4 mb-3 space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-semibold">悬浮窗字号（不影响设置页）</span>
            <span className="label-dim text-sm">{ws.fontSize}px</span>
          </div>
          <input
            type="range"
            min={11}
            max={18}
            step={1}
            value={ws.fontSize}
            onChange={(e) => ws.setFontSize(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: 'var(--accent)' }}
          />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-semibold">文案自动刷新间隔</span>
            <span className="label-dim text-sm">{ws.quoteInterval} 分钟</span>
          </div>
          <input
            type="range"
            min={1}
            max={60}
            step={1}
            value={ws.quoteInterval}
            onChange={(e) => ws.setQuoteInterval(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: 'var(--accent)' }}
          />
        </div>

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

      {/* 心情 */}
      <div className="card p-4 mb-3">
        <div className="font-semibold text-sm mb-3">今日心情</div>
        <div className="flex gap-2 flex-wrap">
          {MOOD_LIST.map((m) => (
            <button
              key={m}
              className={`btn text-sm px-3 py-1.5 ${todayMood === m ? 'btn-primary' : ''}`}
              onClick={() => setTodayMood(m)}
            >
              {MOOD_META[m].emoji} {MOOD_META[m].label}
            </button>
          ))}
        </div>
      </div>

      {/* 喝水 / 站立提醒 */}
      <div className="card p-4 mb-3">
        <div className="font-semibold text-sm mb-3">喝水 / 站立提醒</div>
        <div className="space-y-5">
          <ReminderEditor
            title="💧 喝水提醒"
            config={reminder.water}
            onChange={(patch) => reminder.setWater(patch)}
          />
          <ReminderEditor
            title="🧍 站立提醒"
            config={reminder.stand}
            onChange={(patch) => reminder.setStand(patch)}
          />
        </div>
      </div>

      {/* 模块配置（排序） */}
      <div className="card p-4">
        <div className="font-semibold text-sm mb-1">显示模块（可开关 · 排序）</div>
        <div className="text-[11px] label-faint mb-3">
          顺序 = 悬浮窗中从上到下的显示顺序，已启用的模块按以下顺序排列。
        </div>
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
                    <button className="btn btn-ghost text-xs px-2" disabled={idx <= 0} onClick={() => ws.moveModule(m, -1)}>↑</button>
                    <button className="btn btn-ghost text-xs px-2" disabled={idx >= ws.modules.length - 1} onClick={() => ws.moveModule(m, 1)}>↓</button>
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

function ReminderEditor({
  title,
  config,
  onChange,
}: {
  title: string
  config: { enabled: boolean; startTime: string; endTime: string; intervalMinutes: number; workdaysOnly: boolean }
  onChange: (patch: Partial<typeof config>) => void
}) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--card)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-sm">{title}</div>
        <Toggle on={config.enabled} onChange={(b) => onChange({ enabled: b })} />
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <label className="label-dim block mb-1">开始时间</label>
          <input className="input" type="time" value={config.startTime} onChange={(e) => onChange({ startTime: e.target.value })} />
        </div>
        <div>
          <label className="label-dim block mb-1">结束时间</label>
          <input className="input" type="time" value={config.endTime} onChange={(e) => onChange({ endTime: e.target.value })} />
        </div>
        <div className="col-span-2">
          <div className="flex justify-between mb-1">
            <label className="label-dim">间隔（分钟）</label>
            <span className="label-dim">{config.intervalMinutes} 分钟</span>
          </div>
          <input
            type="range"
            min={5}
            max={120}
            step={5}
            value={config.intervalMinutes}
            onChange={(e) => onChange({ intervalMinutes: Number(e.target.value) })}
            className="w-full"
            style={{ accentColor: 'var(--accent)' }}
          />
        </div>
        <div className="col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.workdaysOnly} onChange={(e) => onChange({ workdaysOnly: e.target.checked })} />
            <span>仅工作日提醒（按你设置的每周工作日）</span>
          </label>
        </div>
      </div>
    </div>
  )
}

function dateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (b: boolean) => void; disabled?: boolean }) {
  return (
    <button
      className="relative w-10 h-6 rounded-full transition-all"
      style={{ background: on ? 'var(--accent)' : 'var(--bar-track)', opacity: disabled ? 0.4 : 1 }}
      disabled={disabled}
      onClick={() => onChange(!on)}
    >
      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: on ? '18px' : '2px' }} />
    </button>
  )
}
