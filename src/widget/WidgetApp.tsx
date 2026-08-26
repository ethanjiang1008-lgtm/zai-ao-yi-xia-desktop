import { useEffect, useMemo, useRef, useState } from 'react'
import { useUserStore } from '../stores/userStore'
import { useWidgetStore, modulesForSize, SIZE_CONFIG } from '../stores/widgetStore'
import { useFishStore } from '../stores/fishStore'
import { getTodaySnapshot, type TodaySnapshot, type WorkState } from '../services/TimeService'
import { collectStats } from '../services/engine'
import { levelXpInfo } from '../constants/levels'
import { fenToYuanLabel, fenToYuanLiveLabel, perSecondLabel } from '../utils/money'
import { fmtHMS, fmtMinHM, dateStr, hhmmToMin } from '../utils/format'
import { getTodayStatus } from '../services/todayStatus'
import { pickQuote, sceneForState } from '../constants/quotes'
import { companionMessage } from '../services/companion'
import { goalProgress, useGoalStore } from '../stores/goalStore'
import { startDragging, isTauri, tauriInvoke, tauriListen, setWidgetSize } from '../services/tauri'
import { ProgressBar } from '../components/ui'
import { useProgressStore } from '../stores/progressStore'
import { useToastStore } from '../stores/toastStore'
import { useMoodStore, MOOD_META } from '../stores/moodStore'
import type { WidgetModuleId } from '../types'

interface Props {
  previewMode?: boolean
}

/** 状态徽章配置 */
function statusBadge(snap: TodaySnapshot, profile: { segments: { start: string; end: string }[] }) {
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  if (snap.state === 'offday') {
    return { dot: 'off', text: '休息日', sub: '' }
  }
  if (snap.state === 'after') {
    return { dot: 'off', text: '已下班', sub: '' }
  }
  if (snap.state === 'before') {
    const firstStart = Math.min(...profile.segments.map((s) => hhmmToMin(s.start)))
    const left = firstStart - nowMin
    return { dot: 'warn', text: '准备中', sub: left > 0 ? `还差 ${left}min` : '' }
  }
  if (snap.state === 'break') {
    const nextStart = profile.segments
      .map((s) => hhmmToMin(s.start))
      .find((m) => m > nowMin)
    if (nextStart != null) {
      const left = nextStart - nowMin
      const hh = Math.floor(left / 60)
      const mm = left % 60
      return {
        dot: 'warn',
        text: '午休中',
        sub: hh > 0 ? `${hh}h${mm}min 后继续` : `${mm}min 后继续`,
      }
    }
    return { dot: 'warn', text: '午休中', sub: '' }
  }
  // working
  return {
    dot: '',
    text: '赚钱中',
    sub: `${perSecondLabel(snap.perSecondFen)}`,
  }
}

/** 把 0.0158 这样的浮点 fen 拆成 ¥0.00 + .0158（高亮小数位） */
function splitLiveYuan(fen: number): { whole: string; fraction: string } {
  const yuan = fen / 100
  const fixed = yuan.toFixed(4) // 保留 4 位小数
  const dotIdx = fixed.indexOf('.')
  if (dotIdx < 0) return { whole: fixed, fraction: '' }
  // 把「分」（2 位）放整数位，剩下的 2 位放小数位高亮
  // 例如 0.0158 → "0.01" + "58"
  // 例如 12.3456 → "12.34" + "56"
  const head = fixed.slice(0, dotIdx + 3) // 含分
  const tail = fixed.slice(dotIdx + 3) // 厘
  return { whole: head, fraction: tail }
}

export default function WidgetApp({ previewMode = false }: Props) {
  const profile = useUserStore((s) => s.profile)
  const onboarded = useUserStore((s) => s.onboarded)
  const ws = useWidgetStore()
  const [now, setNow] = useState(() => new Date())
  const [quoteTick, setQuoteTick] = useState(0)
  const [prevWorked, setPrevWorked] = useState(0)
  const [flash, setFlash] = useState(false)
  const flashTimer = useRef<number | null>(null)

  const isFishing = useFishStore((s) => s.isFishing)
  const fishSeconds = useFishStore((s) => s.fishSeconds)
  const fishCostFen = useFishStore((s) => s.fishCostFen)
  const fishToggle = useFishStore((s) => s.toggle)
  const fishEnd = useFishStore((s) => s.endAndReport)
  const fishTick = useFishStore((s) => s.tick)

  const moodToday = useMoodStore((s) => s.daily[dateStr(new Date())]) ?? null

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (previewMode) return
    const minutes = Math.max(1, Math.min(60, ws.quoteInterval || 3))
    const id = setInterval(() => setQuoteTick((t) => t + 1), minutes * 60 * 1000)
    return () => clearInterval(id)
  }, [ws.quoteInterval, previewMode])

  useEffect(() => {
    if (!isTauri || previewMode) return
    void tauriListen('tray-action', (payload) => {
      if (payload === 'fish') doToggleFish()
    })
  }, [previewMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const snap: TodaySnapshot | null = useMemo(
    () => (profile ? getTodaySnapshot(now, profile) : null),
    [now, profile]
  )

  // 鱼缸心跳：每工作一秒就触发一次闪光，强化「数字在动」的视觉反馈
  useEffect(() => {
    if (!snap) return
    if (snap.workedSeconds !== prevWorked) {
      const increased = snap.workedSeconds > prevWorked
      setPrevWorked(snap.workedSeconds)
      if (increased && snap.state === 'working') {
        setFlash(true)
        if (flashTimer.current) window.clearTimeout(flashTimer.current)
        flashTimer.current = window.setTimeout(() => setFlash(false), 500)
      }
    }
  }, [snap, prevWorked])

  useEffect(() => {
    if (isFishing && snap) {
      fishTick(snap.perSecondFen)
    }
  }, [now]) // eslint-disable-line react-hooks/exhaustive-deps

  // 同步 widget 窗口尺寸到当前 SIZE_CONFIG（拖动 / 切换尺寸）
  useEffect(() => {
    if (previewMode) return
    const cfg = SIZE_CONFIG[ws.size]
    void setWidgetSize(cfg.w, cfg.h)
  }, [ws.size, previewMode])

  // 按尺寸裁剪模块（超过 maxModules 的不渲染）
  const visibleModules = useMemo(
    () => modulesForSize(ws.modules, ws.size),
    [ws.modules, ws.size]
  )

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
        <div className="widget-card widget-capsule p-4 text-sm tank-label">请先完成配置</div>
      </div>
    )
  }

  const stats = collectStats()
  const levelInfo = levelXpInfo(stats.totalWorkMinutes)
  const currentGoal = useGoalStore.getState().goals.find((g) => g.isCurrent && g.status === 'active') || null
  const goalInfo = currentGoal ? goalProgress(currentGoal, stats.totalEarnedFen) : null
  const status = getTodayStatus(now)
  const scene = sceneForState(snap.state as WorkState, now.getDay(), now.getHours(), snap.nearOff)
  const quote = ws.showQuote ? pickQuote(scene, dateStr(now) + scene + '|' + quoteTick) : ''
  const companion = ws.showCompanion ? companionMessage(now, snap, fenToYuanLabel(snap.earnedFen)) : ''
  const moodMeta = moodToday ? MOOD_META[moodToday] : null
  const earnedLive = fenToYuanLiveLabel(snap.earnedFen, 4) // 实时微动：4 位小数
  const earnedLiveSplit = splitLiveYuan(snap.earnedFen)
  const badge = statusBadge(snap, profile)
  const isWorking = snap.state === 'working'
  const isPaused = !isWorking // 午休 / 下班前 / 下班 / 休息日 → 暂停
  const pausedLabel: Record<typeof snap.state, string> = {
    working: '',
    break: '午休中',
    before: '准备中',
    after: '已下班',
    offday: '休息日',
  }

  const openMain = () => void tauriInvoke('show_main')
  const hideWidget = () => void tauriInvoke('toggle_widget')

  return (
    <div
      className="widget-root group w-full h-full"
      style={{ opacity: ws.opacity, padding: previewMode ? 0 : 4 }}
      onMouseDown={handleDrag}
    >
      <div
        className="widget-card widget-capsule w-full h-full flex flex-col relative overflow-hidden"
      >
        {/* 背景气泡（鱼缸氛围） */}
        <div className="widget-bubbles" />

        {/* hover 控制栏 */}
        {!previewMode && (
          <div className="absolute bottom-1.5 right-1.5 z-20 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-sm rounded-full px-1 py-0.5" data-nodrag>
            <button className="btn btn-ghost text-[9px] px-1 py-0.5" onClick={() => ws.setSize('S')}>S</button>
            <button className="btn btn-ghost text-[9px] px-1 py-0.5" onClick={() => ws.setSize('M')}>M</button>
            <button className="btn btn-ghost text-[9px] px-1 py-0.5" onClick={() => ws.setSize('L')}>L</button>
            <button className="btn btn-ghost text-[10px] px-1 py-0.5" onClick={openMain}>⚙</button>
            <button className="btn btn-ghost text-[10px] px-1 py-0.5" onClick={hideWidget}>×</button>
          </div>
        )}

        {/* 顶部品牌 + 状态徽章 */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1 shrink-0 relative z-10">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🐟</span>
            <span className="text-[11px] font-semibold tank-label">Fish</span>
          </div>
          <div className="widget-status" data-nodrag>
            <span className={`dot ${badge.dot}`} />
            <span>{badge.text}</span>
            {badge.sub && <span className="opacity-70">· {badge.sub}</span>}
          </div>
        </div>

        {/* 暂停角标（非工作时显示，提示用户「数字没动是正常的」） */}
        {isPaused && (
          <div className="widget-paused-badge" data-nodrag>
            ⏸ {pausedLabel[snap.state]}
            {badge.sub && ` · ${badge.sub}`}
          </div>
        )}

        {ws.size === 'S' && (
          <SizeS
            snap={snap}
            earnedLive={earnedLive}
            earnedLiveSplit={earnedLiveSplit}
            perSecLabel={perSecondLabel(snap.perSecondFen)}
            moodEmoji={moodMeta?.emoji ?? null}
            flash={flash}
            isPaused={isPaused}
          />
        )}
        {ws.size === 'M' && (
          <SizeM
            snap={snap}
            modules={visibleModules}
            has={has(ws.modules)}
            earnedLive={earnedLive}
            earnedLiveSplit={earnedLiveSplit}
            perSecLabel={perSecondLabel(snap.perSecondFen)}
            moodMeta={moodMeta}
            quote={quote}
            flash={flash}
            isPaused={isPaused}
            isWorking={isWorking}
          />
        )}
        {ws.size === 'L' && (
          <SizeL
            snap={snap}
            modules={visibleModules}
            has={has(ws.modules)}
            levelInfo={levelInfo}
            goalInfo={goalInfo}
            currentGoal={currentGoal}
            quote={quote}
            companion={companion}
            status={status}
            earnedLive={earnedLive}
            earnedLiveSplit={earnedLiveSplit}
            perSecLabel={perSecondLabel(snap.perSecondFen)}
            fishProps={{ isFishing, fishSeconds, fishCostFen }}
            onFish={doToggleFish}
            moodMeta={moodMeta}
            flash={flash}
            isPaused={isPaused}
            isWorking={isWorking}
          />
        )}

        {/* 底部水波装饰 */}
        <div className="widget-water">
          <svg viewBox="0 0 280 14" preserveAspectRatio="none">
            <path
              d="M0,7 C40,2 80,12 140,7 C200,2 240,12 280,7 L280,14 L0,14 Z"
              fill="rgba(255,255,255,0.06)"
            />
            <path
              d="M0,9 C50,5 100,13 160,9 C220,5 250,11 280,9 L280,14 L0,14 Z"
              fill="rgba(255,255,255,0.04)"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}

function has(modules: WidgetModuleId[]) {
  return (m: WidgetModuleId) => modules.includes(m)
}

/* ===== S 极简：胶囊形（高瘦） ===== */
function SizeS({
  snap,
  earnedLive,
  earnedLiveSplit,
  perSecLabel,
  moodEmoji,
  flash,
  isPaused,
}: {
  snap: TodaySnapshot
  earnedLive: string
  earnedLiveSplit: { whole: string; fraction: string }
  perSecLabel: string
  moodEmoji: string | null
  flash: boolean
  isPaused: boolean
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-3 pb-3 overflow-hidden relative z-10">
      <div className="text-[9px] tank-label mb-0.5">{perSecLabel}</div>
      <div className={`text-2xl font-bold tank-money leading-tight ${flash ? 'tick-flash' : ''} ${isPaused ? 'is-paused' : ''}`}>
        ¥{earnedLiveSplit.whole}
      </div>
      <div className="text-[9px] tank-label mt-1 flex items-center gap-1.5 justify-center">
        {moodEmoji && <span>{moodEmoji}</span>}
        <span>进度 {Math.round(snap.progress * 100)}%</span>
      </div>
    </div>
  )
}

/* ===== M 标准 ===== */
function SizeM({
  snap,
  modules,
  has,
  earnedLive,
  earnedLiveSplit,
  perSecLabel,
  moodMeta,
  quote,
  flash,
  isPaused,
  isWorking,
}: {
  snap: TodaySnapshot
  modules: WidgetModuleId[]
  has: (m: WidgetModuleId) => boolean
  earnedLive: string
  earnedLiveSplit: { whole: string; fraction: string }
  perSecLabel: string
  moodMeta: { label: string; emoji: string } | null
  quote: string
  flash: boolean
  isPaused: boolean
  isWorking: boolean
}) {
  return (
    <div className="flex-1 flex flex-col gap-1.5 px-2.5 pb-4 overflow-hidden relative z-10">
      {/* 收入主块：圆形/大圆角的水滴形焦点 */}
      {has('salary') && (
        <div className={`widget-money-block ${isPaused ? 'is-paused' : ''}`}>
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[9px] tank-label">今日已赚 · {isWorking ? '实时' : '暂停'}</div>
              <div className={`text-[22px] font-bold tank-money leading-none mt-0.5 ${flash ? 'tick-flash' : ''} ${isPaused ? 'is-paused' : ''}`}>
                ¥{earnedLiveSplit.whole}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[8px] tank-label">{perSecLabel}</div>
              {moodMeta && <div className="text-base mt-0.5">{moodMeta.emoji}</div>}
            </div>
          </div>
        </div>
      )}

      {/* 进度 + 倒计时：胶囊形并排 */}
      {(has('progress') || has('countdown')) && (
        <div className="grid grid-cols-2 gap-1.5">
          {has('progress') && (
            <div className="widget-section widget-section-compact">
              <div className="flex justify-between items-center text-[9px] mb-0.5">
                <span className="tank-label">进度</span>
                <span className="tank-label font-mono">{Math.round(snap.progress * 100)}%</span>
              </div>
              <ProgressBar value={snap.progress} height={3} />
            </div>
          )}
          {has('countdown') && (
            <div className="widget-section widget-section-compact">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] tank-label">下班</span>
                <span className="text-[11px] font-mono font-bold tank-money">
                  {snap.state === 'after' ? '🎉 已下班' : snap.state === 'offday' ? '休息' : fmtHMS(snap.secondsToOff)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 心情：胶囊 */}
      {has('mood') && (
        <div className="widget-section widget-section-compact flex items-center justify-between text-[10px]">
          <span className="tank-label">心情</span>
          {moodMeta ? (
            <span>{moodMeta.emoji} {moodMeta.label}</span>
          ) : (
            <span className="tank-label">未选</span>
          )}
        </div>
      )}

      {/* 文案：胶囊 */}
      {has('quote') && quote && (
        <div className="widget-section widget-section-compact text-[10px] tank-label truncate">
          {quote}
        </div>
      )}
    </div>
  )
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
  earnedLive,
  earnedLiveSplit,
  perSecLabel,
  fishProps,
  onFish,
  moodMeta,
  flash,
  isPaused,
  isWorking,
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
  earnedLive: string
  earnedLiveSplit: { whole: string; fraction: string }
  perSecLabel: string
  fishProps: { isFishing: boolean; fishSeconds: number; fishCostFen: number }
  onFish: () => void
  moodMeta: { label: string; emoji: string } | null
  flash: boolean
  isPaused: boolean
  isWorking: boolean
}) {
  type RenderResult = { node: React.ReactNode; compact?: boolean } | null
  const renderers: Record<WidgetModuleId, () => RenderResult> = {
    level: () =>
      levelInfo
        ? {
            node: (
              <div className="flex items-center gap-2">
                <span className="accent-grad text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Lv.{levelInfo.level}</span>
                <span className="text-[11px] font-semibold tank-money">{levelInfo.title}</span>
              </div>
            ),
          }
        : null,
    salary: () => ({
      node: (
        <div className={`widget-money-block ${isPaused ? 'is-paused' : ''}`}>
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[9px] tank-label">今日已赚 · {isWorking ? '实时微动' : '暂停'}</div>
              <div className={`text-[28px] font-bold tank-money leading-none mt-0.5 ${flash ? 'tick-flash' : ''} ${isPaused ? 'is-paused' : ''}`}>
                ¥{earnedLiveSplit.whole}
              </div>
              <div className="text-[9px] tank-label mt-1">{perSecLabel}</div>
            </div>
            {moodMeta && <div className="text-2xl shrink-0">{moodMeta.emoji}</div>}
          </div>
        </div>
      ),
    }),
    progress: () => ({
      node: (
        <div className="widget-section widget-section-compact">
          <div className="flex justify-between text-[9px] mb-1">
            <span className="tank-label">今日进度</span>
            <span className="tank-label font-mono">{Math.round(snap.progress * 100)}%</span>
          </div>
          <ProgressBar value={snap.progress} height={4} />
        </div>
      ),
    }),
    countdown: () => ({
      node: (
        <div className="widget-section widget-section-compact text-center">
          <div className="text-[9px] tank-label">下班倒计时</div>
          <div className="font-mono text-base font-bold tank-money mt-0.5">
            {snap.state === 'after' ? '🎉 已下班' : snap.state === 'offday' ? '休息日' : fmtHMS(snap.secondsToOff)}
          </div>
        </div>
      ),
    }),
    goal: () =>
      currentGoal && goalInfo
        ? {
            node: (
              <div className="widget-section widget-section-compact">
                <div className="flex items-center gap-1.5 text-[10px] mb-1">
                  <span className="text-sm">{currentGoal.emoji}</span>
                  <span className="tank-label truncate flex-1">{currentGoal.name}</span>
                  <span className="tank-label font-mono">{Math.round(goalInfo.progress * 100)}%</span>
                </div>
                <ProgressBar value={goalInfo.progress} height={4} />
              </div>
            ),
          }
        : null,
    xp: () => ({
      node: (
        <div className="widget-section widget-section-compact">
          <div className="flex justify-between text-[9px] mb-1">
            <span className="tank-label">XP</span>
            <span className="tank-label font-mono">{levelInfo.currentXp}/{levelInfo.needXp}</span>
          </div>
          <ProgressBar value={levelInfo.progress} height={3} />
        </div>
      ),
    }),
    status: () => ({
      node: (
        <div className="widget-section widget-section-compact flex items-center gap-2 text-[10px]">
          <span className="text-sm">{status.emoji}</span>
          <span className="tank-label">{status.statusLabel}</span>
          <span className="ml-auto tank-label">动力 {status.motivation}%</span>
        </div>
      ),
    }),
    fish: () => ({
      node: (
        <div className="widget-section widget-section-compact flex items-center justify-between" data-nodrag>
          <div className="text-[11px]">
            {fishProps.isFishing ? (
              <span className="font-mono font-semibold tank-money">
                ⏱ {fmtHMS(fishProps.fishSeconds)} · {fenToYuanLabel(fishProps.fishCostFen)}
              </span>
            ) : (
              <span className="tank-label">🐟 摸一下鱼</span>
            )}
          </div>
          <button className="btn text-[10px] px-2 py-0.5" onClick={onFish}>
            {fishProps.isFishing ? '⏹ 停' : '▶ 鱼'}
          </button>
        </div>
      ),
    }),
    quote: () =>
      quote
        ? { node: <div className="widget-section widget-section-compact text-[10px] tank-label text-center leading-snug">{quote}</div> }
        : null,
    companion: () =>
      companion
        ? {
            node: (
              <div className="widget-section widget-section-compact flex items-start gap-2 text-[10px]">
                <span className="text-sm shrink-0">🐱</span>
                <span className="tank-label leading-snug">{companion}</span>
              </div>
            ),
          }
        : null,
    mood: () => ({
      node: (
        <div className="widget-section widget-section-compact flex items-center gap-2 text-[10px]">
          {moodMeta ? (
            <>
              <span className="text-sm">{moodMeta.emoji}</span>
              <span className="tank-label">今日心情 · {moodMeta.label}</span>
            </>
          ) : (
            <>
              <span className="text-sm opacity-50">😐</span>
              <span className="tank-label">未选心情</span>
            </>
          )}
        </div>
      ),
    }),
  }

  return (
    <div className="flex-1 flex flex-col gap-1.5 px-2.5 pb-4 overflow-y-auto relative z-10">
      {modules.map((m) => {
        if (!has(m)) return null
        const r = renderers[m]()
        if (!r) return null
        return (
          <div key={m}>
            {r.node}
          </div>
        )
      })}
    </div>
  )
}