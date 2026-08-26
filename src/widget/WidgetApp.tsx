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

interface Props {
  previewMode?: boolean
}

export default function WidgetApp({ previewMode = false }: Props) {
  const profile = useUserStore((s) => s.profile)
  const onboarded = useUserStore((s) => s.onboarded)
  const ws = useWidgetStore()
  const [now, setNow] = useState(() => new Date())

  // fish store — 用 selector 只订阅需要的字段，避免全量订阅触发多余 re-render
  const isFishing = useFishStore((s) => s.isFishing)
  const fishSeconds = useFishStore((s) => s.fishSeconds)
  const fishCostFen = useFishStore((s) => s.fishCostFen)
  const fishToggle = useFishStore((s) => s.toggle)
  const fishEnd = useFishStore((s) => s.endAndReport)

  // clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // 监听托盘摸鱼事件
  useEffect(() => {
    if (!isTauri || previewMode) return
    void tauriListen('tray-action', (payload) => {
      if (payload === 'fish') doToggleFish()
    })
  }, [previewMode])

  // 用 useMemo 稳定 snap 引用——只在 now 或 profile 变化时重新计算
  const snap: TodaySnapshot | null = useMemo(
    () => (profile ? getTodaySnapshot(now, profile) : null),
    [now, profile]
  )

  // 摸鱼计时：依赖 [now]，每秒最多触发一次，不会循环
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
        <div className="widget-card p-4 text-sm label-dim">请先完成配置</div>
      </div>
    )
  }

  const stats = collectStats()
  const levelInfo = levelXpInfo(stats.totalWorkMinutes)
  const currentGoal = useGoalStore.getState().goals.find((g) => g.isCurrent && g.status === 'active') || null
  const goalInfo = currentGoal ? goalProgress(currentGoal, stats.totalEarnedFen) : null
  const status = getTodayStatus(now)
  const scene = sceneForState(snap.state, now.getDay(), now.getHours(), snap.nearOff)
  const quote = ws.showQuote ? pickQuote(scene, dateStr(now) + scene) : ''
  const companion = ws.showCompanion ? companionMessage(now, snap, fenToYuanLabel(snap.earnedFen)) : ''

  const has = (m: string) => ws.modules.includes(m as any)

  const openMain = () => void tauriInvoke('show_main')
  const hideWidget = () => void tauriInvoke('toggle_widget')

  const fishProps = { isFishing, fishSeconds, fishCostFen }

  return (
    <div
      className="widget-root group w-full h-full"
      style={{ opacity: ws.opacity, padding: previewMode ? 0 : 4 }}
      onMouseDown={handleDrag}
    >
      <div className="widget-card w-full h-full flex flex-col relative overflow-hidden" style={{ borderRadius: 16 }}>
        {/* hover 控制栏 */}
        {!previewMode && (
          <div className="absolute top-1 right-1 z-10 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" data-nodrag>
            <button className="btn btn-ghost text-[10px] px-1.5 py-0.5" onClick={() => ws.setSize('S')}>S</button>
            <button className="btn btn-ghost text-[10px] px-1.5 py-0.5" onClick={() => ws.setSize('M')}>M</button>
            <button className="btn btn-ghost text-[10px] px-1.5 py-0.5" onClick={() => ws.setSize('L')}>L</button>
            <button className="btn btn-ghost text-sm px-1.5 py-0.5" onClick={openMain}>⚙</button>
            <button className="btn btn-ghost text-sm px-1.5 py-0.5" onClick={hideWidget}>×</button>
          </div>
        )}

        {ws.size === 'S' && <SizeS snap={snap} has={has} earnedLabel={fenToYuanLabel(snap.earnedFen)} />}
        {ws.size === 'M' && (
          <SizeM
            snap={snap}
            has={has}
            quote={quote}
            earnedLabel={fenToYuanLabel(snap.earnedFen)}
          />
        )}
        {ws.size === 'L' && (
          <SizeL
            snap={snap}
            has={has}
            levelInfo={levelInfo}
            goalInfo={goalInfo}
            currentGoal={currentGoal}
            quote={quote}
            companion={companion}
            status={status}
            earnedLabel={fenToYuanLabel(snap.earnedFen)}
            fishProps={fishProps}
            onFish={doToggleFish}
          />
        )}
      </div>
    </div>
  )
}

/* ===== S 极简 ===== */
function SizeS({ snap, has, earnedLabel }: { snap: TodaySnapshot; has: (m: string) => boolean; earnedLabel: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-3">
      <div className="text-2xl font-bold accent-text">{earnedLabel}</div>
      <div className="label-faint text-[10px] mt-0.5">今日已赚</div>
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
  has,
  quote,
  earnedLabel,
}: {
  snap: TodaySnapshot
  has: (m: string) => boolean
  quote: string
  earnedLabel: string
}) {
  return (
    <div className="flex-1 flex flex-col px-3 py-2.5 gap-1.5">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold accent-text">{earnedLabel}</span>
        {has('progress') && <span className="label-dim text-xs">进度 {Math.round(snap.progress * 100)}%</span>}
      </div>
      {has('countdown') && (
        <div className="label-dim text-xs">
          {snap.state === 'after' ? '已下班 🎉' : snap.state === 'offday' ? '休息中' : `距离下班 ${fmtHMS(snap.secondsToOff)}`}
        </div>
      )}
      {has('quote') && quote && <div className="label-faint text-[11px] truncate">{quote}</div>}
    </div>
  )
}

/* ===== L 游戏模式 ===== */
function SizeL({
  snap,
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
}: {
  snap: TodaySnapshot
  has: (m: string) => boolean
  levelInfo: ReturnType<typeof levelXpInfo>
  goalInfo: { progress: number; remaining: number } | null
  currentGoal: { emoji: string; name: string } | null
  quote: string
  companion: string
  status: ReturnType<typeof getTodayStatus>
  earnedLabel: string
  fishProps: { isFishing: boolean; fishSeconds: number; fishCostFen: number }
  onFish: () => void
}) {
  return (
    <div className="flex-1 flex flex-col px-3.5 py-3 gap-2 overflow-y-auto">
      {/* 等级 */}
      {has('level') && (
        <div className="flex items-center gap-2">
          <span className="accent-grad text-white text-[10px] font-bold px-1.5 py-0.5 rounded">Lv.{levelInfo.level}</span>
          <span className="text-xs font-semibold">{levelInfo.title}</span>
        </div>
      )}

      {/* 收入 */}
      {has('salary') && (
        <div className="text-center">
          <div className="text-3xl font-bold accent-text">{earnedLabel}</div>
          <div className="label-faint text-[10px]">{perSecondLabel(snap.perSecondFen)}</div>
        </div>
      )}

      {/* 进度 */}
      {has('progress') && (
        <div>
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className="label-dim">今日进度</span>
            <span className="label-dim">{Math.round(snap.progress * 100)}%</span>
          </div>
          <ProgressBar value={snap.progress} height={5} />
        </div>
      )}

      {/* 倒计时 */}
      {has('countdown') && (
        <div className="text-center">
          <div className="label-faint text-[10px]">下班倒计时</div>
          <div className="font-mono text-lg font-bold">
            {snap.state === 'after' ? '下班 🎉' : snap.state === 'offday' ? '休息日' : fmtHMS(snap.secondsToOff)}
          </div>
        </div>
      )}

      {/* 目标 */}
      {has('goal') && currentGoal && goalInfo && (
        <div>
          <div className="flex items-center gap-1 text-[10px] mb-0.5">
            <span>{currentGoal.emoji}</span>
            <span className="label-dim truncate">{currentGoal.name}</span>
            <span className="label-dim ml-auto">{Math.round(goalInfo.progress * 100)}%</span>
          </div>
          <ProgressBar value={goalInfo.progress} height={5} />
        </div>
      )}

      {/* XP */}
      {has('xp') && (
        <div>
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className="label-dim">XP</span>
            <span className="label-dim">{levelInfo.currentXp}/{levelInfo.needXp}</span>
          </div>
          <ProgressBar value={levelInfo.progress} height={4} />
        </div>
      )}

      {/* 状态 */}
      {has('status') && (
        <div className="flex items-center gap-2 text-[10px]">
          <span>{status.emoji}</span>
          <span className="label-dim">{status.statusLabel} · 动力 {status.motivation}%</span>
        </div>
      )}

      {/* 摸鱼 */}
      {has('fish') && (
        <div className="flex items-center justify-between text-[10px]" data-nodrag>
          <div>
            {fishProps.isFishing ? (
              <span className="font-mono font-bold">{fmtHMS(fishProps.fishSeconds)} · {fenToYuanLabel(fishProps.fishCostFen)}</span>
            ) : (
              <span className="label-dim">🐟 摸鱼一下</span>
            )}
          </div>
          <button className="btn text-[9px] px-1.5 py-0.5" onClick={onFish}>{fishProps.isFishing ? '停' : '鱼'}</button>
        </div>
      )}

      {/* 文案 */}
      {has('quote') && quote && <div className="label-faint text-[10px] text-center truncate">{quote}</div>}

      {/* 搭子 */}
      {has('companion') && companion && (
        <div className="flex items-start gap-1.5 text-[10px]">
          <span>🐱</span>
          <span className="label-dim">{companion}</span>
        </div>
      )}
    </div>
  )
}
