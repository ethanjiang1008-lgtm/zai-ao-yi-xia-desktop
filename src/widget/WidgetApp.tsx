import { useEffect, useMemo, useState } from 'react'
import { useUserStore } from '../stores/userStore'
import { useWidgetStore } from '../stores/widgetStore'
import { useFishStore } from '../stores/fishStore'
import { getTodaySnapshot, type TodaySnapshot } from '../services/TimeService'
import { collectStats } from '../services/engine'
import { levelXpInfo } from '../constants/levels'
import { fenToYuanLabel, perSecondLabel } from '../utils/money'
import { fmtHMS, fmtMinHM, dateStr } from '../utils/format'
import { getTodayStatus } from '../services/todayStatus'
import { pickQuote, sceneForState } from '../constants/quotes'
import { companionMessage } from '../services/companion'
import { goalProgress, useGoalStore } from '../stores/goalStore'
import { startDragging, isTauri, tauriInvoke, tauriListen } from '../services/tauri'
import { ProgressBar } from '../components/ui'
import { useProgressStore } from '../stores/progressStore'
import { useToastStore } from '../stores/toastStore'
import { useWeatherStore, deriveWeather, deriveTempC, WEATHER_META } from '../stores/weatherStore'
import { useMoodStore, MOOD_META } from '../stores/moodStore'
import type { WidgetModuleId } from '../types'

interface Props {
  previewMode?: boolean
}

export default function WidgetApp({ previewMode = false }: Props) {
  const profile = useUserStore((s) => s.profile)
  const onboarded = useUserStore((s) => s.onboarded)
  const ws = useWidgetStore()
  const [now, setNow] = useState(() => new Date())
  const [quoteTick, setQuoteTick] = useState(0) // 触发文案定时刷新

  // fish store
  const isFishing = useFishStore((s) => s.isFishing)
  const fishSeconds = useFishStore((s) => s.fishSeconds)
  const fishCostFen = useFishStore((s) => s.fishCostFen)
  const fishToggle = useFishStore((s) => s.toggle)
  const fishEnd = useFishStore((s) => s.endAndReport)

  // 天气 / 心情
  const city = useWeatherStore((s) => s.city)
  const moodToday = useMoodStore((s) => s.daily[dateStr(new Date())]) ?? null

  // clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // 文案定时刷新（默认 3 分钟，可由用户在 widget 配置改）
  useEffect(() => {
    if (previewMode) return
    const minutes = Math.max(1, Math.min(60, ws.quoteInterval || 3))
    const id = setInterval(() => setQuoteTick((t) => t + 1), minutes * 60 * 1000)
    return () => clearInterval(id)
  }, [ws.quoteInterval, previewMode])

  // 监听托盘摸鱼事件
  useEffect(() => {
    if (!isTauri || previewMode) return
    void tauriListen('tray-action', (payload) => {
      if (payload === 'fish') doToggleFish()
    })
  }, [previewMode])

  const snap: TodaySnapshot | null = useMemo(
    () => (profile ? getTodaySnapshot(now, profile) : null),
    [now, profile]
  )

  useEffect(() => {
    if (isFishing && snap) {
      fishTick(snap.perSecondFen)
    }
  }, [now]) // eslint-disable-line react-hooks/exhaustive-deps

  const fishTick = useFishStore((s) => s.tick)

  const doToggleFish = () => {
    if (isFishing) {
      const report = fishEnd()
      if (report && report.seconds > 0) {
        useProgressStore.getState().endFish(Date.now())
        useToastStore.getState().push({
          kind: 'info',
          icon: '🐟',
          title: '你买下了一点自由',
          desc: `花 ${fenToYuanLabel(report.costFen)} 买下了 ${fmtMinHM(Math.round(report.seconds / 60))} 自由。`,
        })
      }
    } else {
      useProgressStore.getState().startFish(Date.now())
      fishToggle(snap?.perSecondFen ?? 0)
    }
  }

  const handleDrag = (e: React.MouseEvent) => {
    if (previewMode) return
    const target = e.target as HTMLElement
    if (target.closest('[data-nodrag]')) return
    void startDragging()
  }

  if (!onboarded || !profile || !snap) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ opacity: ws.opacity }}>
        <div className="widget-card p-3 text-sm label-dim">请先完成配置</div>
      </div>
    )
  }

  const stats = collectStats()
  const levelInfo = levelXpInfo(stats.totalWorkMinutes)
  const currentGoal = useGoalStore.getState().goals.find((g) => g.isCurrent && g.status === 'active') || null
  const goalInfo = currentGoal ? goalProgress(currentGoal, stats.totalEarnedFen) : null
  const status = getTodayStatus(now)
  const scene = sceneForState(snap.state, now.getDay(), now.getHours(), snap.nearOff)
  // quoteTick 进入 seedKey，使每次定时刷新后文案换一条
  const quote = ws.showQuote ? pickQuote(scene, dateStr(now) + scene + '|' + quoteTick) : ''
  const companion = ws.showCompanion ? companionMessage(now, snap, fenToYuanLabel(snap.earnedFen)) : ''
  const todayKey = dateStr(now)
  const weatherCond = deriveWeather(todayKey, city || '深圳', Math.floor(now.getHours() / 3))
  const weatherTemp = deriveTempC(weatherCond, todayKey)
  const weatherMeta = WEATHER_META[weatherCond]
  const moodMeta = moodToday ? MOOD_META[moodToday] : null

  const openMain = () => void tauriInvoke('show_main')
  const hideWidget = () => void tauriInvoke('toggle_widget')

  const fishProps = { isFishing, fishSeconds, fishCostFen }
  const earnedLabel = fenToYuanLabel(snap.earnedFen)

  return (
    <div
      className="widget-root group w-full h-full"
      style={{ opacity: ws.opacity, padding: previewMode ? 0 : 3 }}
      onMouseDown={handleDrag}
    >
      <div
        className="widget-card w-full h-full flex flex-col relative overflow-hidden"
        style={{ borderRadius: 16, background: 'var(--card-solid)' }}
      >
        {/* hover 控制栏 */}
        {!previewMode && (
          <div className="absolute top-0.5 right-0.5 z-10 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" data-nodrag>
            <button className="btn btn-ghost text-[9px] px-1 py-0.5" onClick={() => ws.setSize('S')}>S</button>
            <button className="btn btn-ghost text-[9px] px-1 py-0.5" onClick={() => ws.setSize('M')}>M</button>
            <button className="btn btn-ghost text-[9px] px-1 py-0.5" onClick={() => ws.setSize('L')}>L</button>
            <button className="btn btn-ghost text-[10px] px-1 py-0.5" onClick={openMain}>⚙</button>
            <button className="btn btn-ghost text-[10px] px-1 py-0.5" onClick={hideWidget}>×</button>
          </div>
        )}

        {ws.size === 'S' && (
          <SizeS
            snap={snap}
            has={has(ws.modules)}
            earnedLabel={earnedLabel}
            weatherEmoji={weatherMeta.emoji}
            weatherTemp={weatherTemp}
            moodEmoji={moodMeta?.emoji ?? null}
          />
        )}
        {ws.size === 'M' && (
          <SizeM
            snap={snap}
            modules={ws.modules}
            has={has(ws.modules)}
            quote={quote}
            earnedLabel={earnedLabel}
            weatherMeta={weatherMeta}
            weatherTemp={weatherTemp}
            moodMeta={moodMeta}
            city={city}
          />
        )}
        {ws.size === 'L' && (
          <SizeL
            snap={snap}
            modules={ws.modules}
            has={has(ws.modules)}
            levelInfo={levelInfo}
            goalInfo={goalInfo}
            currentGoal={currentGoal}
            quote={quote}
            companion={companion}
            status={status}
            earnedLabel={earnedLabel}
            fishProps={fishProps}
            onFish={doToggleFish}
            weatherMeta={weatherMeta}
            weatherTemp={weatherTemp}
            city={city}
            moodMeta={moodMeta}
          />
        )}
      </div>
    </div>
  )
}

/** has(模块列表) 工厂 */
function has(modules: WidgetModuleId[]) {
  return (m: WidgetModuleId) => modules.includes(m)
}

/* ===== S 极简 ===== */
function SizeS({
  snap,
  has,
  earnedLabel,
  weatherEmoji,
  weatherTemp,
  moodEmoji,
}: {
  snap: TodaySnapshot
  has: (m: WidgetModuleId) => boolean
  earnedLabel: string
  weatherEmoji: string
  weatherTemp: number
  moodEmoji: string | null
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-3">
      <div className="text-2xl font-bold accent-text">{earnedLabel}</div>
      <div className="label-faint text-[10px] mt-0.5">今日已赚</div>
      {/* 顶角：天气 + 心情 */}
      <div className="absolute top-1 left-1.5 flex gap-1.5 text-[10px] opacity-80">
        <span>{weatherEmoji} {weatherTemp}°</span>
        {moodEmoji && <span>{moodEmoji}</span>}
      </div>
      {/* hover 展开额外信息 */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] mt-2 label-dim">
        <div>进度 {Math.round(snap.progress * 100)}%</div>
        {snap.state !== 'after' && snap.state !== 'offday' && (
          <div>下班 {fmtHMS(snap.secondsToOff)}</div>
        )}
      </div>
    </div>
  )
}

/* ===== M 标准 ===== */
function SizeM({
  snap,
  modules,
  has,
  quote,
  earnedLabel,
  weatherMeta,
  weatherTemp,
  moodMeta,
  city,
}: {
  snap: TodaySnapshot
  modules: WidgetModuleId[]
  has: (m: WidgetModuleId) => boolean
  quote: string
  earnedLabel: string
  weatherMeta: { label: string; emoji: string }
  weatherTemp: number
  moodMeta: { label: string; emoji: string } | null
  city: string
}) {
  // 渲染顺序 = 用户在 modules 数组里的顺序
  return (
    <div className="flex-1 flex flex-col px-2.5 py-2 gap-1.5">
      {/* 第一行：收入 + 天气 + 心情 */}
      {(() => null)()}
      {/* 顶行固定按模块顺序拼 */}
      <ModuleRow
        modules={modules}
        renderModule={(m) => {
          if (m === 'salary') {
            return (
              <span className="text-2xl font-bold accent-text">{earnedLabel}</span>
            )
          }
          if (m === 'weather') {
            return (
              <span className="text-xs label-dim shrink-0">
                {weatherMeta.emoji} {weatherTemp}° {city ? '' : ''}
              </span>
            )
          }
          if (m === 'mood') {
            return moodMeta ? (
              <span className="text-xs shrink-0">{moodMeta.emoji} {moodMeta.label}</span>
            ) : (
              <span className="text-[10px] label-faint shrink-0">心情未选</span>
            )
          }
          if (m === 'progress') {
            return <span className="label-dim text-[10px]">进度 {Math.round(snap.progress * 100)}%</span>
          }
          if (m === 'countdown') {
            return (
              <span className="label-dim text-[10px]">
                {snap.state === 'after' ? '已下班 🎉' : snap.state === 'offday' ? '休息中' : `距离下班 ${fmtHMS(snap.secondsToOff)}`}
              </span>
            )
          }
          return null
        }}
      />
      {/* 进度条（如果启用了 progress） */}
      {has('progress') && (
        <div className="px-0.5">
          <ProgressBar value={snap.progress} height={4} />
        </div>
      )}
      {/* 文案 */}
      {has('quote') && quote && <div className="label-faint text-[10px] truncate">{quote}</div>}
    </div>
  )
}

/* 工具：按 modules 顺序拼接 React 节点；用 Fragment 隔开以保持横排 */
function ModuleRow({
  modules,
  renderModule,
  gap = 8,
}: {
  modules: WidgetModuleId[]
  renderModule: (m: WidgetModuleId) => React.ReactNode
  gap?: number
}) {
  const items: React.ReactNode[] = []
  modules.forEach((m) => {
    const node = renderModule(m)
    if (node != null) {
      if (items.length > 0) items.push(<span key={`g-${m}`} style={{ width: gap }} />)
      items.push(<span key={m}>{node}</span>)
    }
  })
  return <div className="flex items-baseline gap-0 flex-wrap">{items}</div>
}

/* ===== L 游戏模式 ===== */
function SizeL({
  snap,
  modules,
  has,
  levelInfo,
  goalInfo,
  currentGoal,
  quote,
  companion,
  status,
  earnedLabel,
  fishProps,
  onFish,
  weatherMeta,
  weatherTemp,
  city,
  moodMeta,
}: {
  snap: TodaySnapshot
  modules: WidgetModuleId[]
  has: (m: WidgetModuleId) => boolean
  levelInfo: ReturnType<typeof levelXpInfo>
  goalInfo: { progress: number; remaining: number } | null
  currentGoal: { emoji: string; name: string } | null
  quote: string
  companion: string
  status: ReturnType<typeof getTodayStatus>
  earnedLabel: string
  fishProps: { isFishing: boolean; fishSeconds: number; fishCostFen: number }
  onFish: () => void
  weatherMeta: { label: string; emoji: string }
  weatherTemp: number
  city: string
  moodMeta: { label: string; emoji: string } | null
}) {
  // 每个模块的渲染器
  const renderers: Record<WidgetModuleId, () => React.ReactNode> = {
    level: () =>
      levelInfo ? (
        <div className="flex items-center gap-1.5">
          <span className="accent-grad text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Lv.{levelInfo.level}</span>
          <span className="text-[11px] font-semibold">{levelInfo.title}</span>
        </div>
      ) : null,
    salary: () => (
      <div className="text-center">
        <div className="text-2xl font-bold accent-text">{earnedLabel}</div>
        <div className="label-faint text-[9px]">{perSecondLabel(snap.perSecondFen)}</div>
      </div>
    ),
    progress: () => (
      <div>
        <div className="flex justify-between text-[9px] mb-0.5">
          <span className="label-dim">今日进度</span>
          <span className="label-dim">{Math.round(snap.progress * 100)}%</span>
        </div>
        <ProgressBar value={snap.progress} height={4} />
      </div>
    ),
    countdown: () => (
      <div className="text-center">
        <div className="label-faint text-[9px]">下班倒计时</div>
        <div className="font-mono text-base font-bold">
          {snap.state === 'after' ? '下班 🎉' : snap.state === 'offday' ? '休息日' : fmtHMS(snap.secondsToOff)}
        </div>
      </div>
    ),
    goal: () =>
      currentGoal && goalInfo ? (
        <div>
          <div className="flex items-center gap-1 text-[9px] mb-0.5">
            <span>{currentGoal.emoji}</span>
            <span className="label-dim truncate">{currentGoal.name}</span>
            <span className="label-dim ml-auto">{Math.round(goalInfo.progress * 100)}%</span>
          </div>
          <ProgressBar value={goalInfo.progress} height={4} />
        </div>
      ) : null,
    xp: () => (
      <div>
        <div className="flex justify-between text-[9px] mb-0.5">
          <span className="label-dim">XP</span>
          <span className="label-dim">{levelInfo.currentXp}/{levelInfo.needXp}</span>
        </div>
        <ProgressBar value={levelInfo.progress} height={3} />
      </div>
    ),
    status: () => (
      <div className="flex items-center gap-1.5 text-[10px]">
        <span>{status.emoji}</span>
        <span className="label-dim">{status.statusLabel} · 动力 {status.motivation}%</span>
      </div>
    ),
    fish: () => (
      <div className="flex items-center justify-between text-[10px]" data-nodrag>
        <div>
          {fishProps.isFishing ? (
            <span className="font-mono font-bold">{fmtHMS(fishProps.fishSeconds)} · {fenToYuanLabel(fishProps.fishCostFen)}</span>
          ) : (
            <span className="label-dim">🐟 摸鱼一下</span>
          )}
        </div>
        <button className="btn text-[9px] px-1.5 py-0.5" onClick={onFish}>
          {fishProps.isFishing ? '停' : '鱼'}
        </button>
      </div>
    ),
    quote: () => (quote ? <div className="label-faint text-[10px] text-center truncate">{quote}</div> : null),
    companion: () =>
      companion ? (
        <div className="flex items-start gap-1.5 text-[10px]">
          <span>🐱</span>
          <span className="label-dim">{companion}</span>
        </div>
      ) : null,
    weather: () => (
      <div className="flex items-center gap-1.5 text-[10px]">
        <span className="text-base leading-none">{weatherMeta.emoji}</span>
        <div className="flex flex-col leading-tight">
          <span>{weatherTemp}°C</span>
          <span className="label-faint text-[9px]">{weatherMeta.label}{city ? ' · ' + city : ''}</span>
        </div>
      </div>
    ),
    mood: () =>
      moodMeta ? (
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="text-base leading-none">{moodMeta.emoji}</span>
          <span className="label-dim">今日心情 · {moodMeta.label}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="text-base leading-none opacity-50">😐</span>
          <span className="label-faint">未选心情</span>
        </div>
      ),
  }

  return (
    <div className="flex-1 flex flex-col px-2.5 py-2 gap-1.5 overflow-y-auto">
      {modules.map((m) => {
        if (!has(m)) return null
        const node = renderers[m]()
        if (node == null) return null
        return <div key={m}>{node}</div>
      })}
    </div>
  )
}
