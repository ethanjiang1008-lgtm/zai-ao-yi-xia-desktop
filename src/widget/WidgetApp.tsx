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
  const [quoteTick, setQuoteTick] = useState(0)

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
  const quote = ws.showQuote ? pickQuote(scene, dateStr(now) + scene + '|' + quoteTick) : ''
  const companion = ws.showCompanion ? companionMessage(now, snap, fenToYuanLabel(snap.earnedFen)) : ''
  const moodMeta = moodToday ? MOOD_META[moodToday] : null
  const earnedLabel = fenToYuanLabel(snap.earnedFen)
  const perSecLabel = perSecondLabel(snap.perSecondFen)

  const openMain = () => void tauriInvoke('show_main')
  const hideWidget = () => void tauriInvoke('toggle_widget')

  return (
    <div
      className="widget-root group w-full h-full"
      style={{ opacity: ws.opacity, padding: previewMode ? 0 : 4 }}
      onMouseDown={handleDrag}
    >
      <div
        className="widget-card w-full h-full flex flex-col relative overflow-hidden"
        style={{ borderRadius: 18, background: 'var(--card-solid)' }}
      >
        {!previewMode && (
          <div className="absolute top-1 right-1 z-10 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" data-nodrag>
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
            earnedLabel={earnedLabel}
            perSecLabel={perSecLabel}
            moodEmoji={moodMeta?.emoji ?? null}
          />
        )}
        {ws.size === 'M' && (
          <SizeM
            snap={snap}
            modules={ws.modules}
            has={has(ws.modules)}
            earnedLabel={earnedLabel}
            perSecLabel={perSecLabel}
            moodMeta={moodMeta}
            quote={quote}
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
            perSecLabel={perSecLabel}
            fishProps={{ isFishing, fishSeconds, fishCostFen }}
            onFish={doToggleFish}
            moodMeta={moodMeta}
          />
        )}
      </div>
    </div>
  )
}

function has(modules: WidgetModuleId[]) {
  return (m: WidgetModuleId) => modules.includes(m)
}

/* ===== S 极简 ===== */
function SizeS({
  snap,
  earnedLabel,
  perSecLabel,
  moodEmoji,
}: {
  snap: TodaySnapshot
  earnedLabel: string
  perSecLabel: string
  moodEmoji: string | null
}) {
  return (
    <div className="flex-1 flex flex-col gap-1.5 p-2 overflow-hidden">
      <div className="widget-section flex-1 flex flex-col items-center justify-center text-center">
        <div className="text-[10px] label-faint mb-0.5">今日已赚 · {perSecLabel}</div>
        <div className="text-2xl font-bold accent-text leading-tight">{earnedLabel}</div>
        {moodEmoji && <div className="text-xs mt-1 label-dim">{moodEmoji} 今日心情</div>}
      </div>
      <div className="widget-section widget-section-compact flex items-center justify-between text-[10px]">
        <span className="label-faint">进度</span>
        <span className="font-mono font-semibold">{Math.round(snap.progress * 100)}%</span>
      </div>
    </div>
  )
}

/* ===== M 标准 ===== */
function SizeM({
  snap,
  modules,
  has,
  earnedLabel,
  perSecLabel,
  moodMeta,
  quote,
}: {
  snap: TodaySnapshot
  modules: WidgetModuleId[]
  has: (m: WidgetModuleId) => boolean
  earnedLabel: string
  perSecLabel: string
  moodMeta: { label: string; emoji: string } | null
  quote: string
}) {
  return (
    <div className="flex-1 flex flex-col gap-1.5 p-2 overflow-hidden">
      {/* 收入主块：最大、最显眼 */}
      {has('salary') && (
        <div className="widget-section flex items-center justify-between">
          <div>
            <div className="text-[10px] label-faint">今日已赚</div>
            <div className="text-xl font-bold accent-text leading-none mt-0.5">{earnedLabel}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] label-faint">{perSecLabel}</div>
            {moodMeta && (
              <div className="text-[10px] mt-0.5">{moodMeta.emoji}</div>
            )}
          </div>
        </div>
      )}

      {/* 进度 + 倒计时 + 心情：紧凑行 */}
      {(has('progress') || has('countdown') || has('mood')) && (
        <div className="grid grid-cols-2 gap-1.5">
          {has('progress') && (
            <div className="widget-section widget-section-compact">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="label-faint">今日进度</span>
                <span className="label-dim font-mono">{Math.round(snap.progress * 100)}%</span>
              </div>
              <ProgressBar value={snap.progress} height={3} />
            </div>
          )}
          {has('countdown') && (
            <div className="widget-section widget-section-compact">
              <div className="text-[10px] label-faint">下班</div>
              <div className="text-[12px] font-mono font-bold leading-tight">
                {snap.state === 'after' ? '🎉 已下班' : snap.state === 'offday' ? '休息' : fmtHMS(snap.secondsToOff)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 心情单行（如启用） */}
      {has('mood') && (
        <div className="widget-section widget-section-compact flex items-center justify-between text-[10px]">
          <span className="label-faint">今日心情</span>
          {moodMeta ? (
            <span>{moodMeta.emoji} {moodMeta.label}</span>
          ) : (
            <span className="label-faint">未选</span>
          )}
        </div>
      )}

      {/* 文案 */}
      {has('quote') && quote && (
        <div className="widget-section widget-section-compact text-[10px] label-faint truncate">
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
  earnedLabel,
  perSecLabel,
  fishProps,
  onFish,
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
  perSecLabel: string
  fishProps: { isFishing: boolean; fishSeconds: number; fishCostFen: number }
  onFish: () => void
  moodMeta: { label: string; emoji: string } | null
}) {
  // 每个模块的渲染器，返回 (node, isCompact)
  type RenderResult = { node: React.ReactNode; compact?: boolean } | null
  const renderers: Record<WidgetModuleId, () => RenderResult> = {
    level: () =>
      levelInfo
        ? {
            node: (
              <div className="flex items-center gap-2">
                <span className="accent-grad text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Lv.{levelInfo.level}</span>
                <span className="text-[12px] font-semibold">{levelInfo.title}</span>
              </div>
            ),
          }
        : null,
    salary: () => ({
      node: (
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] label-faint">今日已赚</div>
            <div className="text-2xl font-bold accent-text leading-none mt-0.5">{earnedLabel}</div>
          </div>
          <div className="text-right text-[10px] label-faint">{perSecLabel}</div>
        </div>
      ),
    }),
    progress: () => ({
      node: (
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="label-faint">今日进度</span>
            <span className="label-dim font-mono">{Math.round(snap.progress * 100)}%</span>
          </div>
          <ProgressBar value={snap.progress} height={4} />
        </div>
      ),
    }),
    countdown: () => ({
      node: (
        <div className="text-center">
          <div className="text-[10px] label-faint">下班倒计时</div>
          <div className="font-mono text-base font-bold mt-0.5">
            {snap.state === 'after' ? '🎉 已下班' : snap.state === 'offday' ? '休息日' : fmtHMS(snap.secondsToOff)}
          </div>
        </div>
      ),
    }),
    goal: () =>
      currentGoal && goalInfo
        ? {
            node: (
              <div>
                <div className="flex items-center gap-1.5 text-[10px] mb-1">
                  <span className="text-sm">{currentGoal.emoji}</span>
                  <span className="label-dim truncate flex-1">{currentGoal.name}</span>
                  <span className="label-dim font-mono">{Math.round(goalInfo.progress * 100)}%</span>
                </div>
                <ProgressBar value={goalInfo.progress} height={4} />
              </div>
            ),
          }
        : null,
    xp: () => ({
      node: (
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="label-faint">XP</span>
            <span className="label-dim font-mono">{levelInfo.currentXp}/{levelInfo.needXp}</span>
          </div>
          <ProgressBar value={levelInfo.progress} height={3} />
        </div>
      ),
    }),
    status: () => ({
      node: (
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-sm">{status.emoji}</span>
          <span className="label-dim">{status.statusLabel}</span>
          <span className="ml-auto label-faint">动力 {status.motivation}%</span>
        </div>
      ),
    }),
    fish: () => ({
      node: (
        <div className="flex items-center justify-between" data-nodrag>
          <div className="text-[11px]">
            {fishProps.isFishing ? (
              <span className="font-mono font-semibold">
                ⏱ {fmtHMS(fishProps.fishSeconds)} · {fenToYuanLabel(fishProps.fishCostFen)}
              </span>
            ) : (
              <span className="label-faint">🐟 摸一下鱼</span>
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
        ? { node: <div className="text-[10px] label-faint text-center leading-snug">{quote}</div>, compact: true }
        : null,
    companion: () =>
      companion
        ? {
            node: (
              <div className="flex items-start gap-2 text-[10px]">
                <span className="text-sm shrink-0">🐱</span>
                <span className="label-dim leading-snug">{companion}</span>
              </div>
            ),
          }
        : null,
    mood: () => ({
      node: (
        <div className="flex items-center gap-2 text-[10px]">
          {moodMeta ? (
            <>
              <span className="text-sm">{moodMeta.emoji}</span>
              <span className="label-dim">今日心情 · {moodMeta.label}</span>
            </>
          ) : (
            <>
              <span className="text-sm opacity-50">😐</span>
              <span className="label-faint">未选心情</span>
            </>
          )}
        </div>
      ),
    }),
  }

  return (
    <div className="flex-1 flex flex-col gap-1.5 p-2 overflow-y-auto">
      {modules.map((m) => {
        if (!has(m)) return null
        const r = renderers[m]()
        if (!r) return null
        return (
          <div key={m} className={r.compact ? 'widget-section widget-section-compact' : 'widget-section'}>
            {r.node}
          </div>
        )
      })}
    </div>
  )
}
