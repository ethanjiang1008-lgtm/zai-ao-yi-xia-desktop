import { useState, useMemo } from 'react'
import type { TodaySnapshot } from '../services/TimeService'
import { useGoalStore, goalProgress, categoryEmoji } from '../stores/goalStore'
import { collectStats } from '../services/engine'
import { fenToYuanLabel } from '../utils/money'
import { fmtMinHM, uid } from '../utils/format'
import { ProgressBar, EmptyState, Modal, useModalState } from '../components/ui'
import type { GoalCategory } from '../types'

const CATEGORIES: GoalCategory[] = ['数码', '美食', '旅行', '生活', '学习', '其他']

interface Props {
  snap: TodaySnapshot | null
}

export default function Goals({ snap }: Props) {
  const goals = useGoalStore((s) => s.goals)
  const addGoal = useGoalStore((s) => s.addGoal)
  const removeGoal = useGoalStore((s) => s.removeGoal)
  const setCurrent = useGoalStore((s) => s.setCurrent)
  const stats = useMemo(() => collectStats(), [goals, snap])

  const addModal = useModalState()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState<GoalCategory>('数码')
  const [error, setError] = useState('')

  const activeGoals = goals.filter((g) => g.status === 'active').sort((a, b) => a.priority - b.priority)
  const completedGoals = goals.filter((g) => g.status === 'completed')

  const handleAdd = () => {
    setError('')
    const n = Number(price)
    if (!name.trim()) {
      setError('请输入目标名称。')
      return
    }
    if (!isFinite(n) || n <= 0) {
      setError('请输入有效的价格。')
      return
    }
    addGoal({
      name: name.trim(),
      priceFen: Math.round(n * 100),
      emoji: categoryEmoji(category),
      category,
      priority: goals.length + 1,
      baselineEarnedFen: stats.totalEarnedFen,
    })
    setName('')
    setPrice('')
    setCategory('数码')
    addModal.setOpen(false)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">🎯 我的愿望</h1>
        <button className="btn btn-primary" onClick={() => addModal.setOpen(true)} data-nodrag>
          ＋ 添加愿望
        </button>
      </div>

      {/* 进行中 */}
      {activeGoals.length === 0 ? (
        <EmptyState icon="🎯" text="给未来的自己买点什么吧。" action={<button className="btn btn-primary" onClick={() => addModal.setOpen(true)}>＋ 添加愿望</button>} />
      ) : (
        <div className="space-y-3 mb-6">
          {activeGoals.map((g) => {
            const info = goalProgress(g, stats.totalEarnedFen)
            return (
              <div key={g.id} className={`card p-4 ${g.isCurrent ? 'animate-glow' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{g.emoji}</span>
                    <div>
                      <div className="font-semibold">{g.name}</div>
                      <div className="label-faint text-xs">{fenToYuanLabel(g.priceFen)} · {g.category}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!g.isCurrent && (
                      <button className="btn btn-ghost text-xs" onClick={() => setCurrent(g.id)} data-nodrag>
                        设为当前
                      </button>
                    )}
                    {g.isCurrent && <span className="chip" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>当前</span>}
                    <button className="btn btn-ghost text-xs" onClick={() => removeGoal(g.id)} data-nodrag>×</button>
                  </div>
                </div>
                <ProgressBar value={info.progress} height={8} />
                <div className="flex justify-between mt-2 text-xs">
                  <span className="label-dim">已赚 {fenToYuanLabel(info.earned)}</span>
                  <span className="label-dim">还差 {fenToYuanLabel(info.remaining)}</span>
                </div>
                {snap && snap.perSecondFen > 0 && (
                  <div className="text-center mt-1 label-faint text-xs">
                    ≈ 还需工作 {fmtMinHM(info.remaining / snap.perSecondFen / 60)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 已完成 → 打工博物馆 */}
      {completedGoals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold label-dim mb-3">🏛️ 我的打工博物馆</h2>
          <div className="grid grid-cols-4 gap-3">
            {completedGoals.map((g) => (
              <div key={g.id} className="card p-4 text-center">
                <div className="text-3xl mb-1">{g.emoji}</div>
                <div className="text-xs font-medium truncate">{g.name}</div>
                <div className="label-faint text-[10px] mt-0.5">{fenToYuanLabel(g.priceFen)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 添加愿望 Modal */}
      {addModal.open && (
        <Modal title="添加愿望" onClose={() => addModal.setOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="label-dim block mb-1">名称</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如 Sony WH-1000XM6" autoFocus />
            </div>
            <div>
              <label className="label-dim block mb-1">价格（元）</label>
              <input className="input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="例如 2499" />
            </div>
            <div>
              <label className="label-dim block mb-1">分类</label>
              <div className="flex gap-1.5 flex-wrap">
                {CATEGORIES.map((c) => (
                  <button key={c} className={`btn text-xs px-3 py-1.5 ${category === c ? 'btn-primary' : ''}`} onClick={() => setCategory(c)}>
                    {categoryEmoji(c)} {c}
                  </button>
                ))}
              </div>
            </div>
            {error && <div className="text-sm" style={{ color: '#ef4444' }}>{error}</div>}
            <button className="btn btn-primary w-full" onClick={handleAdd}>添加</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

void uid
