// 随机文案引擎 QuoteEngine（需求第二十一节）
// 短、轻松、有共鸣、不攻击用户、不制造焦虑、不过度鸡血

export type QuoteScene =
  | 'start'
  | 'working'
  | 'lunch'
  | 'afternoon'
  | 'nearoff'
  | 'offwork'
  | 'monday'
  | 'friday'
  | 'goal'
  | 'levelup'
  | 'fish'
  | 'rest'

const QUOTES: Record<QuoteScene, string[]> = {
  start: [
    '新的一天，先赚为敬。',
    '打工人的早晨，从按下开机键开始。',
    '今天也要努力让老板买上新跑车。',
  ],
  working: [
    '你的工资正在缓慢靠近。',
    '再熬一下。',
    '你不是热爱工作，你只是热爱工资。',
    '键盘敲得越快，钱进得越慢。',
  ],
  lunch: [
    '好好吃饭，下午再熬。',
    '午休是打工人最后的尊严。',
    '吃饱了才有力气想辞职。',
  ],
  afternoon: [
    '下午的时光，最难熬也最值钱。',
    '困意是假的，到点下班是真的。',
    '再撑一会儿，太阳就要下班了。',
  ],
  nearoff: [
    '距离下班只剩最后一个人生。',
    '胜利在望，别在这时候倒下。',
    '再坚持 23 分钟。',
  ],
  offwork: [
    '今天也活下来了。',
    '下班见，辛苦了。',
    '恭喜，从资本家手里成功赎回自己。',
    '这 ¥37.21，是你自由的证明。',
  ],
  monday: [
    '周一幸存者，再次上线。',
    '今天也没有辞职成功。',
    '一周的苦，从这一秒开始计费。',
  ],
  friday: [
    '周五了，再熬一下就是自由。',
    '今天的每一秒都格外值钱。',
    '胜利就在周末前。',
  ],
  goal: ['又一个愿望被你亲手买下。', '打工的意义，正在加载。'],
  levelup: ['社畜等级 +1，恭喜晋升。', '又老了一级。'],
  fish: ['摸鱼不算偷，算买。', '这鱼摸得，物超所值。'],
  rest: ['休息日，工资暂停，灵魂续费。', '不上班的日子，才是真生活。'],
}

/** 按 (日期, 场景) 稳定取一条文案 */
export function pickQuote(scene: QuoteScene, seedKey: string): string {
  const list = QUOTES[scene] || QUOTES.working
  let h = 0
  for (let i = 0; i < seedKey.length; i++) h = (h * 31 + seedKey.charCodeAt(i)) | 0
  const idx = Math.abs(h) % list.length
  return list[idx]
}

/** 根据时间状态推断场景 */
export function sceneForState(
  state: 'offday' | 'before' | 'working' | 'break' | 'after',
  weekday: number,
  hour: number,
  nearOff: boolean
): QuoteScene {
  const dow = weekday // 0=周日..6=周六
  if (state === 'offday') return 'rest'
  if (state === 'after') return 'offwork'
  if (dow === 1) return 'monday'
  if (dow === 5) return 'friday'
  if (nearOff) return 'nearoff'
  if (state === 'break') return 'lunch'
  if (hour >= 13 && hour < 17) return 'afternoon'
  if (state === 'before') return 'start'
  return 'working'
}
