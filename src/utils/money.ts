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
