import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WeatherCondition } from '../types'

interface WeatherState {
  city: string
  setCity: (c: string) => void
}

export const useWeatherStore = create<WeatherState>()(
  persist(
    (set) => ({
      city: '深圳',
      setCity: (city) => set({ city }),
    }),
    { name: 'fish-weather' }
  )
)

/** 天气类型中文 + emoji */
export const WEATHER_META: Record<WeatherCondition, { label: string; emoji: string }> = {
  sunny: { label: '晴', emoji: '☀️' },
  cloudy: { label: '多云', emoji: '⛅' },
  rainy: { label: '雨', emoji: '🌧️' },
  storm: { label: '雷雨', emoji: '⛈️' },
  snow: { label: '雪', emoji: '❄️' },
  fog: { label: '雾', emoji: '🌫️' },
}

const CONDITIONS: WeatherCondition[] = ['sunny', 'cloudy', 'rainy', 'storm', 'snow', 'fog']

/** 用 (日期, 城市) 哈希出当日天气——纯离线，确定性，每次刷新/进入新场景可换种子 */
export function deriveWeather(dateKey: string, city: string, seedOffset = 0): WeatherCondition {
  let h = 0
  const s = dateKey + '|' + city + '|' + seedOffset
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  const idx = Math.abs(h) % CONDITIONS.length
  return CONDITIONS[idx]
}

/** 温度（摄氏度，整数） */
export function deriveTempC(condition: WeatherCondition, dateKey: string): number {
  const base: Record<WeatherCondition, number> = {
    sunny: 28,
    cloudy: 24,
    rainy: 22,
    storm: 20,
    snow: -2,
    fog: 18,
  }
  let h = 0
  const s = dateKey + 'temp'
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  const jitter = Math.abs(h) % 9 - 4 // -4 ~ +4
  return base[condition] + jitter
}
