import { useEffect, useRef, useState } from 'react'
import type { TodaySnapshot } from '../services/TimeService'
import { getTodaySnapshot } from '../services/TimeService'
import type { UserProfile } from '../types'
import { engineTick } from '../services/engine'

/** 每秒驱动时钟 + 引擎 tick；只在这一个地方做时间计算（需求第三十四节） */
export function useClock(profile: UserProfile | null): { now: Date; snap: TodaySnapshot | null } {
  const [now, setNow] = useState(() => new Date())
  const snapRef = useRef<TodaySnapshot | null>(null)

  useEffect(() => {
    const tick = () => {
      const t = new Date()
      setNow(t)
    }
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const snap = profile ? getTodaySnapshot(now, profile) : null
  snapRef.current = snap

  useEffect(() => {
    engineTick(now, snapRef.current)
  }, [now])

  return { now, snap }
}
