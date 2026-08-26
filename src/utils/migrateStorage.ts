// v0.1 → v0.2 存储 key 迁移：把 zyx-* key 复制到 fish-* key（仅在 fish-* 不存在时）
// 一次性的兼容层，老用户升级 v0.2 后不丢数据
const PREFIXES: Array<{ old: string; new: string }> = [
  { old: 'zyx-user', new: 'fish-user' },
  { old: 'zyx-goals', new: 'fish-goals' },
  { old: 'zyx-progress', new: 'fish-progress' },
  { old: 'zyx-widget', new: 'fish-widget' },
  { old: 'zyx-theme', new: 'fish-theme' },
  { old: 'zyx-fish', new: 'fish-fish' },
  { old: 'zyx-toast', new: 'fish-toast' },
]

export function migrateZyxToFish(): boolean {
  if (typeof localStorage === 'undefined') return false
  let migrated = false
  for (const { old: oldKey, new: newKey } of PREFIXES) {
    const oldVal = localStorage.getItem(oldKey)
    if (oldVal == null) continue
    // 仅当 fish-* 不存在时才迁移，避免覆盖新数据
    if (localStorage.getItem(newKey) == null) {
      localStorage.setItem(newKey, oldVal)
      migrated = true
    }
  }
  return migrated
}

// 顶层副作用：模块被加载时立即执行（必须在 store 模块初始化之前）
if (typeof window !== 'undefined') {
  try {
    migrateZyxToFish()
  } catch (e) {
    console.warn('[Fish] storage migration failed:', e)
  }
}
