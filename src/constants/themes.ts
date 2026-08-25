import type { ThemeId } from '../types'

export interface ThemeDef {
  id: ThemeId
  label: string
  dark: boolean
  swatch: [string, string] // 渐变示意色
}

export const THEMES: ThemeDef[] = [
  { id: 'midnight', label: 'Midnight', dark: true, swatch: ['#1b1530', '#5b4bd1'] },
  { id: 'mint', label: 'Mint', dark: false, swatch: ['#f3f7f0', '#5fbf9a'] },
  { id: 'sakura', label: 'Sakura', dark: false, swatch: ['#fcf2f7', '#e07baa'] },
  { id: 'sunset', label: 'Sunset', dark: false, swatch: ['#fff5ec', '#f59e42'] },
  { id: 'cyber', label: 'Cyber', dark: true, swatch: ['#0a0a18', '#c026d3'] },
]
