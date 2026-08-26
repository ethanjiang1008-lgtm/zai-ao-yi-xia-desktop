// 金额处理：内部以"分"（整数）存储，避免浮点误差（需求第三十三节）

/** 分 → 元显示，默认 2 位小数 */
export function fenToYuanStr(fen: number, digits = 2): string {
  const yuan = Math.round(fen) / 100
  return yuan.toFixed(digits)
}

/** 分 → ¥xxx.xx 带符号 */
export function fenToYuanLabel(fen: number, digits = 2): string {
  return `¥${fenToYuanStr(fen, digits)}`
}

/** 分 → 元（保留小数位用于实时微动显示）
 *  - digits=2: ¥0.00  (1 分精度，常规显示)
 *  - digits=3: ¥0.001 (0.1 分精度，每 ~6s 动一次)
 *  - digits=4: ¥0.0001 (0.01 分精度，每秒都动)
 *  默认 4 位小数，确保即使工资低也能看到数字在涨
 */
export function fenToYuanLive(fen: number, digits = 4): string {
  const yuan = fen / 100
  return yuan.toFixed(digits)
}

/** 分 → ¥xxx.xxxx 带符号（实时微动） */
export function fenToYuanLiveLabel(fen: number, digits = 4): string {
  return `¥${fenToYuanLive(fen, digits)}`
}

/** 每秒收入分 → "+ ¥0.024 / 秒" 3 位小数 */
export function perSecondLabel(perSecondFen: number): string {
  return `+ ¥${(perSecondFen / 100).toFixed(3)} / 秒`
}

/** 元输入 → 分（整数），非法返回 null */
export function yuanToFen(input: string): number | null {
  const n = Number(input)
  if (!isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

/** 安全解析数字，失败返回 fallback */
export function safeNum(v: unknown, fallback = 0): number {
  const n = Number(v)
  return isFinite(n) ? n : fallback
}
