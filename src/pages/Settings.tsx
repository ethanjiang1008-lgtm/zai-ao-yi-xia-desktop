import { useState, useRef } from 'react'
import { useUserStore } from '../stores/userStore'
import { useThemeStore } from '../stores/themeStore'
import { THEMES } from '../constants/themes'
import { fenToYuanStr, yuanToFen, safeNum } from '../utils/money'
import { hhmmToMin } from '../utils/format'
import type { ThemeId, WorkSegment, SalaryType } from '../types'
import { downloadExport, importData, clearAllData } from '../services/data'
import { ConfirmModal } from '../components/ui'
import { tauriInvoke, isTauri } from '../services/tauri'

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export default function Settings() {
  const profile = useUserStore((s) => s.profile)!
  const updateProfile = useUserStore((s) => s.updateProfile)
  const reset = useUserStore((s) => s.reset)
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const fontSize = useThemeStore((s) => s.fontSize)
  const setFontSize = useThemeStore((s) => s.setFontSize)
  const animations = useThemeStore((s) => s.animations)
  const setAnimations = useThemeStore((s) => s.setAnimations)

  const [salaryInput, setSalaryInput] = useState(String(profile.monthlySalaryFen / 100))
  const [error, setError] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSalary = () => {
    const fen = yuanToFen(salaryInput)
    if (fen === null) {
      setError('请输入有效的工资金额。')
      return
    }
    setError('')
    updateProfile({ monthlySalaryFen: fen })
  }

  const updateSeg = (i: number, patch: Partial<WorkSegment>) => {
    const next = [...profile.segments]
    next[i] = { ...next[i], ...patch }
    updateProfile({ segments: next })
  }

  const addSeg = () => updateProfile({ segments: [...profile.segments, { start: '19:00', end: '20:00' }] })
  const removeSeg = (i: number) => updateProfile({ segments: profile.segments.filter((_, j) => j !== i) })

  const toggleWeekday = (d: number) => {
    const cur = [...profile.workWeekdays]
    updateProfile({ workWeekdays: cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort() })
  }

  const handleExport = () => downloadExport()
  const handleImportClick = () => fileRef.current?.click()
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const result = await importData(f)
    if (result.ok) {
      setTimeout(() => location.reload(), 500)
    } else {
      setError(result.error || '导入失败')
    }
  }
  const handleClear = () => {
    clearAllData()
    reset()
    setTimeout(() => location.reload(), 300)
  }

  const setSalaryType = (t: SalaryType) => updateProfile({ salaryType: t })

  const totalHours = profile.segments.reduce((a, s) => a + (hhmmToMin(s.end) - hhmmToMin(s.start)) / 60, 0)

  return (
    <div className="p-6 max-w-2xl mx-auto pb-12">
      <h1 className="text-xl font-bold mb-5">⚙️ 设置</h1>

      {/* 我的打工档案 */}
      <div className="card p-4 mb-4">
        <h2 className="font-semibold text-sm mb-3">我的打工档案</h2>
        <div className="space-y-4">
          <div>
            <label className="label-dim block mb-1">月薪（元）</label>
            <div className="flex gap-2">
              <div className="flex items-center gap-1 flex-1">
                <span className="accent-text">¥</span>
                <input className="input flex-1" type="text" value={salaryInput} onChange={(e) => setSalaryInput(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={handleSalary}>保存</button>
            </div>
          </div>
          <div>
            <label className="label-dim block mb-1">工资类型</label>
            <div className="flex gap-2">
              {([['post_tax', '税后'], ['pre_tax', '税前']] as [SalaryType, string][]).map(([v, l]) => (
                <button key={v} className={`btn flex-1 ${profile.salaryType === v ? 'btn-primary' : ''}`} onClick={() => setSalaryType(v)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-dim block mb-1">每月工作日</label>
            <input className="input" type="number" value={profile.workingDaysPerMonth} onChange={(e) => updateProfile({ workingDaysPerMonth: safeNum(e.target.value, 22) })} />
          </div>
          <div>
            <label className="label-dim block mb-1">每周工作日</label>
            <div className="flex gap-1.5 flex-wrap">
              {WEEKDAY_LABELS.map((l, i) => (
                <button key={i} className={`btn text-xs px-3 py-1.5 ${profile.workWeekdays.includes(i + 1) ? 'btn-primary' : ''}`} onClick={() => toggleWeekday(i + 1)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-dim block mb-2">工作时间段（支持多段，含午休拆分）</label>
            <div className="space-y-2">
              {profile.segments.map((seg, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="time" className="input flex-1" value={seg.start} onChange={(e) => updateSeg(i, { start: e.target.value })} />
                  <span className="label-faint">—</span>
                  <input type="time" className="input flex-1" value={seg.end} onChange={(e) => updateSeg(i, { end: e.target.value })} />
                  {profile.segments.length > 1 && <button className="btn btn-ghost px-2" onClick={() => removeSeg(i)}>×</button>}
                </div>
              ))}
            </div>
            <button className="btn mt-2 text-xs" onClick={addSeg}>＋ 添加时间段</button>
          </div>
          <div className="text-xs label-faint">每日工时 {totalHours.toFixed(1)}h · 日薪 ¥{fenToYuanStr(Math.round(profile.monthlySalaryFen / Math.max(1, profile.workingDaysPerMonth)))}</div>
        </div>
      </div>

      {/* 外观 */}
      <div className="card p-4 mb-4">
        <h2 className="font-semibold text-sm mb-3">外观</h2>
        <div className="space-y-4">
          <div>
            <label className="label-dim block mb-2">主题</label>
            <div className="grid grid-cols-5 gap-2">
              {THEMES.map((t) => (
                <button key={t.id} className={`card p-2 text-center transition-all ${theme === t.id ? 'animate-glow' : ''}`} style={{ borderColor: theme === t.id ? 'var(--accent)' : 'var(--border)' }} onClick={() => setTheme(t.id as ThemeId)}>
                  <div className="w-full h-6 rounded mb-1" style={{ background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})` }} />
                  <div className="text-[10px] font-medium">{t.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold">字体大小</span>
              <span className="label-dim text-sm">{fontSize}px</span>
            </div>
            <input type="range" min={13} max={18} step={1} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full" style={{ accentColor: 'var(--accent)' }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">动画效果</span>
            <button className="btn btn-ghost text-xs" onClick={() => setAnimations(!animations)}>{animations ? '已开启' : '已关闭'}</button>
          </div>
        </div>
      </div>

      {/* 数据 */}
      <div className="card p-4">
        <h2 className="font-semibold text-sm mb-3">数据</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={handleExport}>导出数据</button>
          <button className="btn" onClick={handleImportClick}>导入数据</button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
          <button className="btn" style={{ color: '#ef4444' }} onClick={() => setConfirmClear(true)}>清空数据</button>
        </div>
        {error && <div className="mt-2 text-sm" style={{ color: '#ef4444' }}>{error}</div>}
      </div>

      {isTauri && (
        <div className="mt-4 text-center">
          <button className="btn btn-ghost text-xs" onClick={() => void tauriInvoke('show_main')}>
            完成设置，返回桌面卡片
          </button>
        </div>
      )}

      {confirmClear && (
        <ConfirmModal
          title="清空所有数据？"
          message="这将删除你的工资档案、目标、成就和所有历史记录，且无法恢复。"
          confirmText="确认清空"
          onConfirm={handleClear}
          onClose={() => setConfirmClear(false)}
        />
      )}
    </div>
  )
}
