// 塔防肉鸽核心逻辑（纯逻辑、无渲染）
// 蛇形路径地图 + 三种塔 + 波次敌人 + 每5波一次肉鸽强化 3 选 1

export const COLS = 10
export const ROWS = 12

// 隔行蛇形走廊：只走底部起的奇数行横穿、方向交替，偶数行（含连接格）留作建塔空地
function buildPath() {
  const path = []
  const rows = []
  for (let r = ROWS - 1; r >= 1; r -= 2) rows.push(r)
  rows.forEach((r, idx) => {
    const leftToRight = idx % 2 === 0
    if (leftToRight) {
      for (let c = 0; c < COLS; c++) path.push([c, r])
    } else {
      for (let c = COLS - 1; c >= 0; c--) path.push([c, r])
    }
  })
  // 出口到顶行
  const last = path[path.length - 1]
  path.push([last[0], 0])
  return path
}

export const PATH = buildPath()
export const PATH_KEYS = new Set(PATH.map(([c, r]) => `${c},${r}`))

// 塔类型
export const TOWER_TYPES = {
  basic: {
    key: 'basic', name: '纵深炮', cost: 50, upgradeCost: 40,
    range: 2.2, dmg: 14, rate: 1.2, color: '#43A047',
    uDmg: 9, uRange: 0.2, uRate: 0.12,
  },
  rapid: {
    key: 'rapid', name: '速射炮', cost: 80, upgradeCost: 60,
    range: 1.9, dmg: 7, rate: 3.0, color: '#1E88E5',
    uDmg: 4, uRange: 0.15, uRate: 0.25,
  },
  cannon: {
    key: 'cannon', name: '重炮', cost: 130, upgradeCost: 100,
    range: 2.8, dmg: 38, rate: 0.6, color: '#F4511E',
    uDmg: 24, uRange: 0.25, uRate: 0.06,
  },
}

const MAX_WAVES = 12

// 波次敌人参数
function waveParams(wave) {
  const count = Math.min(3 + wave * 2, 26)
  const hp = 20 + wave * 12
  const speed = 1.4 + wave * 0.12
  const reward = 8 + Math.floor(wave * 1.2)
  return { count, hp, speed, reward }
}

export function createGame() {
  return {
    wave: 0,
    gold: 200,
    lives: 10,
    over: false,
    win: false,
    pendingSpawns: [],   // { delay, enemy }
    towers: [],
    enemies: [],
    projectiles: [],
    buffs: { range: 0, dmg: 0, rate: 0 },
  }
}

export function isPathCell(c, r) {
  return PATH_KEYS.has(`${c},${r}`)
}

export function hasTower(state, c, r) {
  return state.towers.some(t => t.col === c && t.row === r)
}

export function getTower(state, c, r) {
  return state.towers.find(t => t.col === c && t.row === r)
}

export function addTower(state, typeKey, c, r) {
  const type = TOWER_TYPES[typeKey]
  if (!type) return { ok: false, reason: '未知塔' }
  if (state.gold < type.cost) return { ok: false, reason: '金币不足' }
  if (isPathCell(c, r)) return { ok: false, reason: '不能建在路径上' }
  if (hasTower(state, c, r)) return { ok: false, reason: '已有炮塔' }
  state.gold -= type.cost
  state.towers.push({ col: c, row: r, type: typeKey, level: 1, cooldown: 0 })
  return { ok: true }
}

export function upgradeTower(state, c, r) {
  const t = getTower(state, c, r)
  if (!t) return { ok: false, reason: '没有炮塔' }
  const type = TOWER_TYPES[t.type]
  if (state.gold < type.upgradeCost) return { ok: false, reason: '金币不足' }
  state.gold -= type.upgradeCost
  t.level += 1
  return { ok: true }
}

// 波次：生成待入场敌人
export function startWave(state) {
  if (state.over) return null
  state.wave += 1
  if (state.wave > MAX_WAVES) return null
  const { count, hp, speed, reward } = waveParams(state.wave)
  state.pendingSpawns = []
  for (let i = 0; i < count; i++) {
    state.pendingSpawns.push({
      delay: i * 0.55,
      enemy: {
        hp, maxHp: hp, speed, reward,
        pos: [PATH[0][0], PATH[0][1]],
        pathIdx: 0, alive: true, active: false,
      },
    })
  }
  return state.wave
}

function towerStats(type, level, buffs) {
  const levelMul = 1 + (level - 1) * 0.35
  return {
    range: type.range * levelMul * (1 + buffs.range),
    dmg: type.dmg + (level - 1) * type.uDmg,
    rate: type.rate * (1 + buffs.rate),
  }
}

function dist(c, r, e) {
  const dx = e.pos[0] - c
  const dy = e.pos[1] - r
  return Math.sqrt(dx * dx + dy * dy)
}

// 每帧逻辑推进
export function update(state, dt) {
  if (state.over) return state

  // 入场
  for (const s of state.pendingSpawns) {
    s.delay -= dt
    if (s.delay <= 0) { s.enemy.active = true; state.enemies.push(s.enemy) }
  }
  state.pendingSpawns = state.pendingSpawns.filter(s => s.delay > 0)

  // 塔攻击
  for (const t of state.towers) {
    const type = TOWER_TYPES[t.type]
    const st = towerStats(type, t.level, state.buffs)
    t.cooldown -= dt
    if (t.cooldown > 0) continue
    // 找射程内最靠前的敌人（pathIdx 最大的）
    let target = null
    for (const e of state.enemies) {
      if (!e.active || !e.alive) continue
      if (dist(t.col, t.row, e) <= st.range) {
        if (!target || e.pathIdx > target.pathIdx) target = e
      }
    }
    if (!target) continue
    t.cooldown = 1 / st.rate
    state.projectiles.push({
      sx: t.col, sy: t.row, target,
      dmg: st.dmg, speed: 9,
      pos: [t.col, t.row],
    })
  }

  // 子弹
  const aliveProjectiles = []
  for (const p of state.projectiles) {
    if (!p.target || !p.target.alive) continue
    const dx = p.target.pos[0] - p.pos[0]
    const dy = p.target.pos[1] - p.pos[1]
    const d = Math.sqrt(dx * dx + dy * dy)
    const step = p.speed * dt
    if (d <= step) {
      p.target.hp -= p.dmg
      if (p.target.hp <= 0) {
        p.target.alive = false
        state.gold += p.target.reward
      }
    } else {
      p.pos[0] += (dx / d) * step
      p.pos[1] += (dy / d) * step
      aliveProjectiles.push(p)
    }
  }
  state.projectiles = aliveProjectiles

  // 敌人移动
  const aliveEnemies = []
  for (const e of state.enemies) {
    if (!e.active) { aliveEnemies.push(e); continue }
    if (!e.alive) continue
    const next = PATH[e.pathIdx + 1]
    if (!next) {
      // 到达终点
      state.lives -= 1
      if (state.lives <= 0) {
        state.lives = 0
        state.over = true
        state.win = false
      }
      continue
    }
    const dx = next[0] - e.pos[0]
    const dy = next[1] - e.pos[1]
    const d = Math.sqrt(dx * dx + dy * dy)
    const step = e.speed * dt
    if (d <= step) {
      e.pos[0] = next[0]; e.pos[1] = next[1]
      e.pathIdx += 1
      aliveEnemies.push(e)
    } else {
      e.pos[0] += (dx / d) * step
      e.pos[1] += (dy / d) * step
      aliveEnemies.push(e)
    }
  }
  state.enemies = aliveEnemies.filter(e => e.alive || !e.active)
  state.enemies = aliveEnemies

  // 胜利判定：已超过最大波次且敌人清空
  if (state.wave >= MAX_WAVES && state.enemies.length === 0 && state.pendingSpawns.length === 0) {
    state.over = true
    state.win = true
  }
  return state
}

export function canStartNextWave(state) {
  return !state.over && state.wave < MAX_WAVES && state.enemies.length === 0 && state.pendingSpawns.length === 0
}

// 每清理几波触发一次肉鸽强化（3 选 1）
export const BUFF_EVERY = 5
export const BUFF_POOL = [
  { key: 'range', label: '全塔射程 +20%', apply: s => { s.buffs.range += 0.2 } },
  { key: 'dmg', label: '全塔伤害 +25%', apply: s => { s.buffs.dmg += 0.25 } },
  { key: 'rate', label: '全塔攻速 +20%', apply: s => { s.buffs.rate += 0.2 } },
  { key: 'gold', label: '金币 +60', apply: s => { s.gold += 60 } },
  { key: 'lives', label: '生命 +2', apply: s => { s.lives += 2 } },
]

export function rollBuffs(count = 3) {
  const pool = BUFF_POOL.slice()
  const out = []
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    out.push(pool.splice(idx, 1)[0])
  }
  return out
}

export function shouldOfferBuff(state) {
  // 上一个波次结束 → 下一个波次将是某关键点：用当前 wave 判断（wave 已 +1）
  return state.wave % BUFF_EVERY === 0 && !state.over
}