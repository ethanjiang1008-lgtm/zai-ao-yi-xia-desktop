import { useState } from 'react'
import { useUserStore } from '../stores/userStore'
import { fenToYuanStr, yuanToFen, safeNum } from '../utils/money'
import { hhmmToMin, minToHHMM } from '../utils/format'
import type { UserProfile, WorkSegment, SalaryType } from '../types'
import { tauriInvoke, isTauri } from '../services/tauri'
import { collectStats } from '../services/engine'
import ToastLayer from '../components/ToastLayer'

const STEP_TEXTS = [
  '你每个月赚多少？',
  '你每天工作多久？',
  '今天，我们能熬过去吗？',
]

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export default function Onboarding() {
  const complete = useUserStore((s) => s.completeOnboarding)
  const [step, setStep] = useState(0)

  // 第一步
  const [salary, setSalary] = useState('')
  const [salaryType, setSalaryType] = useState<SalaryType>('post_tax')
  const [error, setError] = useState('')

  // 第二步
  const [workdaysPerMonth, setWorkdaysPerMonth] = useState('22')
  const [segments, setSegments] = useState<WorkSegment[]>([
    { start: '09:00', end: '12:00' },
    { start: '13:30', end: '18:00' },
  ])
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5])

  const toggleWeekday = (d: number) => {
    setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d]))
  }

  const validSeg = (s: WorkSegment) => {
    const a = hhmmToMin(s.start)
    const b = hhmmToMin(s.end)
    return b > a
  }

  const handleNext = () => {
    setError('')
    if (step === 0) {
      const fen = yuanToFen(salary)
      if (fen === null) {
        setError('请输入有效的工资金额。')
        return
      }
      setStep(1)
      return
    }
    if (step === 1) {
      const wd = safeNum(workdaysPerMonth, 0)
      if (wd <= 0) {
        setError('每月工作日需大于 0。')
        return
      }
      if (weekdays.length === 0) {
        setError('请至少选择一个工作日。')
        return
      }
      if (!segments.every(validSeg)) {
        setError('工作时间段的结束必须晚于开始。')
        return
      }
      setStep(2)
      return
    }
    // 完成
    const fen = yuanToFen(salary) ?? 0
    const profile: UserProfile = {
      monthlySalaryFen: fen,
      salaryType,
      workingDaysPerMonth: safeNum(workdaysPerMonth, 22),
      segments,
      workWeekdays: [...weekdays].sort(),
    }
    complete(profile)
    // Tauri：完成 onboarding 后隐藏主窗口，展示桌面卡片
    if (isTauri) {
      void tauriInvoke('show_main')
    }
  }

  const totalHours = segments.reduce((a, s) => a + (hhmmToMin(s.end) - hhmmToMin(s.start)) / 60, 0)
  const dailyWage = (yuanToFen(salary) ?? 0) / Math.max(1, safeNum(workdaysPerMonth, 22)) / 100
  const hourly = totalHours > 0 ? dailyWage / totalHours : 0

  return (
    <div className="h-screen w-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="card glass w-[520px] max-w-[92vw] p-8 animate-pop">
        {/* 步骤指示 */}
        <div className="flex gap-2 mb-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-all"
              style={{ background: i <= step ? 'var(--accent)' : 'var(--bar-track)' }}
            />
          ))}
        </div>

        <div className="text-xs label-faint mb-2">第 {step + 1} 步 / 共 3 步</div>
        <h1 className="text-2xl font-bold mb-6">{STEP_TEXTS[step]}</h1>

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="label-dim block mb-1">月薪（元）</label>
              <div className="flex items-center gap-2">
                <span className="text-lg accent-text">¥</span>
                <input
                  className="input flex-1"
                  type="text"
                  inputMode="decimal"
                  placeholder="例如 12000"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="label-dim block mb-1">工资类型</label>
              <div className="flex gap-2">
                {([
                  ['post_tax', '税后'],
                  ['pre_tax', '税前'],
                ] as [SalaryType, string][]).map(([v, l]) => (
                  <button
                    key={v}
                    className={`btn flex-1 ${salaryType === v ? 'btn-primary' : ''}`}
                    onClick={() => setSalaryType(v)}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <div className="label-faint mt-2">默认使用税后工资，不做复杂税务计算。</div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="label-dim block mb-1">每月工作日</label>
              <input
                className="input"
                type="number"
                value={workdaysPerMonth}
                onChange={(e) => setWorkdaysPerMonth(e.target.value)}
              />
            </div>
            <div>
              <label className="label-dim block mb-1">每周工作日</label>
              <div className="flex gap-1.5 flex-wrap">
                {WEEKDAY_LABELS.map((l, i) => (
                  <button
                    key={i}
                    className={`btn px-3 py-1.5 text-xs ${weekdays.includes(i + 1) ? 'btn-primary' : ''}`}
                    onClick={() => toggleWeekday(i + 1)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label-dim block mb-2">工作时间段（支持多段）</label>
              <div className="space-y-2">
                {segments.map((seg, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="time"
                      className="input flex-1"
                      value={seg.start}
                      onChange={(e) => {
                        const next = [...segments]
                        next[i] = { ...seg, start: e.target.value }
                        setSegments(next)
                      }}
                    />
                    <span className="label-faint">—</span>
                    <input
                      type="time"
                      className="input flex-1"
                      value={seg.end}
                      onChange={(e) => {
                        const next = [...segments]
                        next[i] = { ...seg, end: e.target.value }
                        setSegments(next)
                      }}
                    />
                    {segments.length > 1 && (
                      <button
                        className="btn btn-ghost px-2"
                        onClick={() => setSegments(segments.filter((_, j) => j !== i))}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                className="btn mt-2 text-xs"
                onClick={() => setSegments([...segments, { start: '19:00', end: '20:00' }])}
              >
                ＋ 添加时间段
              </button>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="label-dim">每日工时 {totalHours.toFixed(1)}h</span>
              <span className="label-dim">日薪 ¥{dailyWage.toFixed(0)}</span>
              <span className="label-dim">时薪 ¥{hourly.toFixed(2)}</span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="text-6xl mb-4">🌙</div>
              <p className="label-dim leading-relaxed">
                档案已就绪。<br />
                日薪 ¥{dailyWage.toFixed(0)} · 时薪 ¥{hourly.toFixed(2)} · 每日工时 {totalHours.toFixed(1)}h
              </p>
              <p className="mt-4 text-sm" style={{ color: 'var(--accent)' }}>
                上鱼，准备就绪。
              </p>
            </div>
          </div>
        )}

        {error && <div className="mt-4 text-sm" style={{ color: '#ef4444' }}>{error}</div>}

        <div className="flex gap-2 mt-6">
          {step > 0 && (
            <button className="btn btn-ghost flex-1" onClick={() => setStep(step - 1)}>
              上一步
            </button>
          )}
          <button className="btn btn-primary flex-1" onClick={handleNext}>
            {step === 2 ? '配置完成' : '下一步'}
          </button>
        </div>
      </div>
      <ToastLayer />
    </div>
  )
}

// 避免 unused import 警告
void fenToYuanStr
void collectStats
void minToHHMM
