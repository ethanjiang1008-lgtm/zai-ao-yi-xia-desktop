import { useMemo } from 'react'
import { useProgressStore } from '../stores/progressStore'
import { useGoalStore } from '../stores/goalStore'
import { collectStats } from '../services/engine'
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORY_LABEL } from '../constants/achievements'
import { levelXpInfo } from '../constants/levels'
import type { AchievementCategory } from '../types'
import { EmptyState } from '../components/ui'
import { dateStr } from '../utils/format'

const RARITY: Record<AchievementCategory, string> = {
  basic: '普通',
  cumulative: '稀有',
  fun: '稀有',
  special: '传说',
}

export default function Achievements() {
  const unlocked = useProgressStore((s) => s.unlocked)
  const goals = useGoalStore((s) => s.goals)
  const stats = useMemo(() => collectStats(), [unlocked, goals])
  const levelInfo = levelXpInfo(stats.totalWorkMinutes)

  const total = ACHIEVEMENTS.length
  const unlockedCount = Object.keys(unlocked).length

  const byCat: Record<string, typeof ACHIEVEMENTS> = {}
  for (const a of ACHIEVEMENTS) {
    if (!byCat[a.category]) byCat[a.category] = []
    byCat[a.category].push(a)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">🏆 社畜图鉴</h1>
        <span className="chip">{unlockedCount} / {total} 已解锁</span>
      </div>

      {/* 等级概览 */}
      <div className="card p-4 mb-5 flex items-center gap-4">
        <div className="accent-grad text-white text-sm font-bold px-3 py-1.5 rounded-full">
          Lv.{levelInfo.level}
        </div>
        <div className="flex-1">
          <div className="font-semibold">{levelInfo.title}</div>
          <div className="label-faint text-xs">{levelInfo.currentXp} / {levelInfo.needXp} XP · 累计工作 {stats.totalWorkMinutes} 分钟</div>
        </div>
      </div>

      {unlockedCount === 0 && (
        <EmptyState icon="🏅" text="你还没有解锁成就。第一个已经在路上了。" />
      )}

      {(['basic', 'cumulative', 'fun', 'special'] as AchievementCategory[]).map((cat) => {
        const list = byCat[cat] || []
        if (list.length === 0) return null
        return (
          <div key={cat} className="mb-5">
            <h2 className="text-sm font-semibold label-dim mb-2">{ACHIEVEMENT_CATEGORY_LABEL[cat]}</h2>
            <div className="grid grid-cols-3 gap-3">
              {list.map((a) => {
                const isUnlocked = !!unlocked[a.id]
                return (
                  <div
                    key={a.id}
                    className="card p-3 text-center"
                    style={isUnlocked ? {} : { opacity: 0.35, filter: 'grayscale(1)' }}
                  >
                    <div className="text-3xl mb-1">{isUnlocked ? a.icon : '🔒'}</div>
                    <div className="text-xs font-semibold truncate">{a.title}</div>
                    <div className="label-faint text-[10px] mt-0.5 leading-tight line-clamp-2">{a.description}</div>
                    <div className="label-faint text-[9px] mt-1">{RARITY[a.category]}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

void dateStr
