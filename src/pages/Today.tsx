import { useEffect, useMemo } from 'react'
import type { TodaySnapshot } from '../services/TimeService'
import { useGoalStore, goalProgress } from '../stores/goalStore'
import { collectStats } from '../services/engine'
import { levelXpInfo } from '../constants/levels'
import { fenToYuanLabel, perSecondLabel } from '../utils/money'
import { dateHeader, fmtHMS, fmtMinHM, dateStr } from '../utils/format'
import { ProgressBar, Ring } from '../components/ui'
import { getTodayStatus } from '../services/todayStatus'
import { pickQuote, sceneForState } from '../constants/quotes'
import { companionMessage } from '../services/companion'
import { useFishStore } from '../stores/fishStore'
import { useProgressStore } from '../stores/progressStore'
import { useToastStore } from '../stores/toastStore'

interface Props {
  now: Date
  snap: TodaySnapshot | null
}

export default function Today({ now, snap }: Props) {
  const goals = useGoalStore((s) => s.goals)
  const stats = useMemo(() => collectStats(), [snap])
  const levelInfo = levelXpInfo(stats.totalWorkMinutes)
  const status = useMemo(() => getTodayStatus(now), [dateStr(now)])
  const fishStore = useFishStore()
  const isFishing = fishStore.isFishing
  const fishSeconds = fishStore.fishSeconds
  const fishCostFen = fishStore.fishCostFen

  // 每秒把 snapshot 喂给 fishStore 并 tick
  useEffect(() => {
    useFishStore.getState().setSnap(snap)
  }, [snap])

  const handleFishToggle = () => {
    if (fishStore.isFishing) {
      const report = fishStore.endAndReport()
      if (report && report.seconds > 0) {
        useProgressStore.getState().startFish(0) // noop if not started
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
      fishStore.toggle()
    }
  }

  const currentGoal = goals.find((g) => g.isCurrent && g.status === 'active') || null
  const goalInfo = currentGoal ? goalProgress(currentGoal, stats.totalEarnedFen) : null
  const etaLabel = useMemo(() => {
    if (!currentGoal || !goalInfo || !snap) return null
    const dailyFen = snap.dailyFen
    if (dailyFen <= 0) return null
    const days = Math.ceil(goalInfo.remaining / dailyFen)
    if (days <= 0) return '今天'
    const d = new Date(now)
    let left = goalInfo.remaining
    let guard = 0
    while (left > 0 && guard < 400) {
      guard++
      d.setDate(d.getDate() + 1)
      // 粗略：工作日才扣
      const dow = d.getDay()
      const isWork = dow >= 1 && dow <= 5
      if (isWork) left -= dailyFen
    }
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }, [currentGoal, goalInfo, snap, now])

  const scene = snap ? sceneForState(snap.state, now.getDay(), now.getHours(), snap.nearOff) : 'working'
  const quote = pickQuote(scene, dateStr(now) + scene)

  if (!snap) {
    return <div className="p-8 label-dim">正在加载…</div>
  }

  return (
    <div className="p-6 max-w-3xl mx-auto" style={{ minHeight: '100%' }}>
      {/* 顶部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm label-dim">{dateHeader(now)}</div>
        <div className="chip">{snap.isWorkday ? '工作日' : '休息日'}</div>
      </div>

      {/* 核心收入 */}
      <div className="card glass p-6 mb-4 text-center">
        <div className="label-dim text-sm mb-1">今日已赚</div>
        <div className="text-5xl font-bold tracking-tight accent-text">
          {fenToYuanLabel(snap.earnedFen)}
        </div>
        <div className="mt-2 text-sm label-faint">
          {perSecondLabel(snap.perSecondFen)}
        </div>
        <div className="mt-3 text-sm" style={{ color: 'var(--text-dim)' }}>
          {quote}
        </div>
      </div>

      {/* 三栏 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* 工作进度 */}
        <div className="card p-4 flex flex-col items-center">
          <div className="label-dim text-xs mb-2">今日进度</div>
          <Ring progress={snap.progress} size={64} stroke={5}>
            <span className="text-sm font-bold">{Math.round(snap.progress * 100)}%</span>
          </Ring>
        </div>

        {/* 下班倒计时 */}
        <div className="card p-4 flex flex-col items-center justify-center">
          <div className="label-dim text-xs mb-2">距离下班</div>
          {snap.state === 'after' ? (
            <div className="text-sm font-bold accent-text">已下班 🎉</div>
          ) : snap.state === 'offday' ? (
            <div className="text-sm font-bold">休息中</div>
          ) : (
            <div className="font-mono text-lg font-bold">{fmtHMS(snap.secondsToOff)}</div>
          )}
          {snap.state === 'working' && (
            <div className="label-faint text-xs mt-1">你还可以再赚 {fenToYuanLabel(snap.remainingEarnFen)}</div>
          )}
        </div>

        {/* 今日状态 */}
        <div className="card p-4 flex flex-col items-center justify-center text-center">
          <div className="label-dim text-xs mb-1">今日状态</div>
          <div className="text-2xl mb-1">{status.emoji}</div>
          <div className="text-xs font-medium">{status.statusLabel}</div>
          <div className="label-faint text-[10px] mt-1">动力 {status.motivation}%</div>
        </div>
      </div>

      {/* 等级 + XP */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="accent-grad text-white text-xs font-bold px-2 py-0.5 rounded-full">
              Lv.{levelInfo.level}
            </span>
            <span className="font-semibold text-sm">{levelInfo.title}</span>
          </div>
          <span className="label-faint text-xs">{levelInfo.currentXp} / {levelInfo.needXp} XP</span>
        </div>
        <ProgressBar value={levelInfo.progress} height={6} />
      </div>

      {/* 当前目标 */}
      {currentGoal && goalInfo ? (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentGoal.emoji}</span>
              <div>
                <div className="font-semibold text-sm">{currentGoal.name}</div>
                <div className="label-faint text-xs">{fenToYuanLabel(currentGoal.priceFen)}</div>
              </div>
            </div>
            {etaLabel && <div className="label-faint text-xs">预计 {etaLabel}</div>}
          </div>
          <ProgressBar value={goalInfo.progress} height={8} />
          <div className="flex justify-between mt-2 text-xs">
            <span className="label-dim">已赚 {fenToYuanLabel(goalInfo.earned)}</span>
            <span className="label-dim">还差 {fenToYuanLabel(goalInfo.remaining)}</span>
          </div>
          <div className="text-center mt-1 label-faint text-xs">
            ≈ 还需工作 {fmtMinHM(snap.perSecondFen > 0 ? goalInfo.remaining / snap.perSecondFen / 60 : 0)}
          </div>
        </div>
      ) : (
        <div className="card p-4 mb-4 text-center label-dim text-sm">
          🎯 还没有当前目标，去「目标」页添加一个愿望吧
        </div>
      )}

      {/* 摸鱼 */}
      <div className="card p-4 mb-4 flex items-center justify-between">
        <div>
          <div className="font-semibold text-sm">🐟 摸鱼一下</div>
          {isFishing ? (
            <div className="mt-1">
              <div className="font-mono text-lg font-bold">{fmtHMS(fishSeconds)}</div>
              <div className="label-faint text-xs">本次成本 {fenToYuanLabel(fishCostFen)}</div>
            </div>
          ) : (
            <div className="label-faint text-xs mt-0.5">买下一点自由时间</div>
          )}
        </div>
        <button className={`btn ${isFishing ? 'btn-primary' : ''}`} onClick={handleFishToggle} data-nodrag>
          {isFishing ? '结束摸鱼' : '开始摸鱼'}
        </button>
      </div>

      {/* 打工搭子 */}
      <div className="card p-4 flex items-start gap-3">
        <div className="text-3xl">🐱</div>
        <div>
          <div className="label-dim text-xs mb-0.5">打工搭子</div>
          <div className="text-sm">{companionMessage(now, snap, fenToYuanLabel(snap.earnedFen))}</div>
        </div>
      </div>
    </div>
  )
}
