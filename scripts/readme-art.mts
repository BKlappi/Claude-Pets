// Generates the README's SVG images from the mod's own bitmaps.
// node scripts/readme-art.mts .   (Node 22.18+ runs TypeScript directly)
import { writeFileSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

const MOD = process.argv[2] ?? '.'
const { SPRITES, HAT_ART, EGG_ART } = await import(pathToFileURL(join(MOD, 'hooks/art.ts')).href)
const OUT = join(MOD, 'assets')
mkdirSync(OUT, { recursive: true })

const HEX: Record<string, string> = {
  claude: '#D77757',
  merged: '#AF87FF',
  text: '#ECECEC',
  error: '#FF6B80',
  success: '#4EBA65',
  suggestion: '#8FA8FF',
  warning: '#FFC107',
  subtle: '#6E6E78',
  inactive: '#A0A0AA',
  planMode: '#48968C',
}
const BG = '#141419'
const CARD = '#1C1C23'
const LINE = '#2C2C36'
const DIM = '#8A8A96'
const FONT = `ui-monospace, SFMono-Regular, 'Cascadia Mono', Menlo, Consolas, monospace`

const SPECIES = ['blob', 'moth', 'ghost', 'crab', 'sprout'] as const
type Species = (typeof SPECIES)[number]
const BODY: Record<Species, string> = { blob: 'claude', moth: 'merged', ghost: 'text', crab: 'error', sprout: 'success' }
const ACCENT: Record<Species, string> = { blob: 'suggestion', moth: 'warning', ghost: 'suggestion', crab: 'warning', sprout: 'merged' }
const STAGES = ['hatchling', 'sprite', 'companion', 'legend'] as const
const STAGE_LEVEL = [1, 3, 5, 10]
const STAGE_COLOR = ['subtle', 'suggestion', 'planMode', 'claude']

let blinkSeed = 0

// `ph` is a pixel's height; a terminal's quadrant pixels are twice as tall as wide.
type SpriteOpts = { body: string; accent: string; px: number; ph?: number; blink?: boolean; closed?: boolean }

// Draws a bitmap as square pixels, merging runs of one color into one rect.
// Open eyes stay holes; with `blink`, their top pixels fill in for a moment.
function sprite(bitmap: readonly string[], x: number, y: number, o: SpriteOpts): string {
  const ph = o.ph ?? o.px
  const color = (p: string) => (p === '#' ? o.body : p === '*' ? o.accent : p === 's' ? HEX.subtle! : p === 'e' && o.closed ? o.body : null)
  let out = ''
  const eyes: string[] = []
  bitmap.forEach((row, r) => {
    let c = 0
    while (c < row.length) {
      const p = row[c]!
      const fill = p === 'e' && o.closed && r % 2 === 1 ? null : color(p)
      if (p === 'e' && !o.closed && r % 2 === 0) eyes.push(`<rect x="${x + c * o.px}" y="${y + r * ph}" width="${o.px}" height="${ph}"/>`)
      if (fill === null) {
        c++
        continue
      }
      let end = c + 1
      while (end < row.length && color(row[end]!) === fill && !(row[end] === 'e' && r % 2 === 1)) end++
      out += `<rect x="${x + c * o.px}" y="${y + r * ph}" width="${(end - c) * o.px}" height="${ph}" fill="${fill}"/>`
      c = end
    }
  })
  if (o.blink && eyes.length > 0) {
    const begin = ((blinkSeed++ * 1.37) % 4).toFixed(2)
    out += `<g fill="${o.body}" opacity="0">${eyes.join('')}<animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.9;0.92;0.97;1" dur="4.5s" begin="${begin}s" repeatCount="indefinite"/></g>`
  }
  return out
}

const sizeOf = (bitmap: readonly string[], px: number) => ({ w: (bitmap[0]?.length ?? 0) * px, h: bitmap.length * px * 2 })

// A four-pointed twinkle.
function spark(x: number, y: number, s: number, fill: string, begin: number): string {
  return `<g fill="${fill}" opacity="0"><rect x="${x - s / 2}" y="${y - s * 1.5}" width="${s}" height="${s * 3}"/><rect x="${x - s * 1.5}" y="${y - s / 2}" width="${s * 3}" height="${s}"/><animate attributeName="opacity" values="0;1;0" dur="2.4s" begin="${begin.toFixed(2)}s" repeatCount="indefinite"/></g>`
}

const text = (x: number, y: number, s: string, fill: string, size = 14, extra = '') =>
  `<text x="${x}" y="${y}" fill="${fill}" font-family="${FONT}" font-size="${size}" ${extra}>${s.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`

const svg = (w: number, h: number, body: string, title: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}" shape-rendering="crispEdges"><title>${title}</title>${body}</svg>\n`

const card = (w: number, h: number) =>
  `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="14" fill="${BG}" stroke="${LINE}"/>`

// A 5x5 pixel font, for the title.
const FONT5: Record<string, string[]> = {
  C: ['.###.', '#....', '#....', '#....', '.###.'],
  L: ['#....', '#....', '#....', '#....', '#####'],
  A: ['.###.', '#...#', '#####', '#...#', '#...#'],
  U: ['#...#', '#...#', '#...#', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '####.', '#....', '#####'],
  P: ['####.', '#...#', '####.', '#....', '#....'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..'],
  S: ['.####', '#....', '.###.', '....#', '####.'],
  ' ': ['.....', '.....', '.....', '.....', '.....'],
}
function pixelText(s: string, x: number, y: number, px: number, fill: string, shadow: string): string {
  let out = ''
  ;[...s].forEach((ch, i) => {
    const glyph = FONT5[ch] ?? FONT5[' ']!
    const gx = x + i * 6 * px
    out += sprite(glyph, gx + px / 2, y + px / 2, { body: shadow, accent: shadow, px })
    out += sprite(glyph, gx, y, { body: fill, accent: fill, px })
  })
  return out
}

// ---- hero: the title over all five species at legend size ----
{
  const W = 960
  const H = 320
  let body = card(W, H)
  const title = 'CLAUDE PETS'
  const tpx = 7
  const tw = title.length * 6 * tpx - tpx
  body += pixelText(title, (W - tw) / 2, 38, tpx, HEX.claude!, '#5A2E22')
  body += text(W / 2, 112, 'hatch it  ·  raise it  ·  watch it evolve', DIM, 15, 'text-anchor="middle"')
  const px = 5
  const gap = W / SPECIES.length
  SPECIES.forEach((sp, i) => {
    const bm = SPRITES[sp][3]
    const { w, h } = sizeOf(bm, px)
    const cx = gap * i + gap / 2
    const y = 150
    body += sprite(bm, cx - w / 2, y, { body: HEX[BODY[sp]]!, accent: HEX[ACCENT[sp]]!, px, ph: px * 2, blink: true })
    body += spark(cx - w / 2 - 10, y + 8, 3, HEX[ACCENT[sp]]!, i * 0.5)
    body += spark(cx + w / 2 + 10, y + h - 12, 3, HEX[ACCENT[sp]]!, i * 0.5 + 1.2)
    body += text(cx, y + h + 34, sp, HEX[BODY[sp]]!, 15, 'text-anchor="middle" font-weight="600"')
  })
  writeFileSync(join(OUT, 'hero.svg'), svg(W, H, body, 'Claude Pets: blob, moth, ghost, crab and sprout'))
}

// ---- terminal: the pet above the prompt, mid-session ----
{
  const W = 880
  const H = 470
  const LH = 22
  let body = card(W, H)
  body += `<rect x="0.5" y="0.5" width="${W - 1}" height="36" rx="14" fill="${CARD}"/><rect x="0.5" y="22" width="${W - 1}" height="15" fill="${CARD}"/><line x1="0" y1="37" x2="${W}" y2="37" stroke="${LINE}"/>`
  ;['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => (body += `<circle cx="${22 + i * 20}" cy="18" r="6" fill="${c}"/>`))
  body += text(W / 2, 23, 'claude  ~/projects/date-utils', DIM, 13, 'text-anchor="middle"')

  let y = 70
  const X = 28
  body += `<rect x="${X - 8}" y="${y - 16}" width="${W - 2 * X + 16}" height="${LH + 2}" rx="4" fill="${CARD}"/>`
  body += text(X, y, '> fix the failing date parser test', '#C8C8D0', 14)
  y += LH * 1.6
  body += text(X, y, '●', HEX.text!, 14) + text(X + 18, y, "The parser drops the timezone offset. Fixing it now.", HEX.text!, 14)
  y += LH * 1.4
  body += text(X, y, '●', HEX.success!, 14) + text(X + 18, y, 'Update(src/parse.rs)', HEX.text!, 14, 'font-weight="600"')
  y += LH
  body += text(X + 18, y, '⎿  Updated src/parse.rs with 3 additions and 1 removal', DIM, 14)
  y += LH * 1.4
  body += text(X, y, '●', HEX.success!, 14) + text(X + 18, y, 'Bash(cargo test)', HEX.text!, 14, 'font-weight="600"')
  y += LH
  body += text(X + 18, y, '⎿  test result: ok. 42 passed; 0 failed', HEX.success!, 14)

  // The band: a companion blob in a top hat, proud of the passing tests.
  const px = 5
  const bm = SPRITES.blob[2]
  const hat = HAT_ART.tophat
  const { w } = sizeOf(bm, px)
  const by = y + 26
  const hatY = by
  const petY = by + hat.length * px * 2
  body += sprite(hat, X + (w - hat[0].length * px) / 2, hatY, { body: HEX.inactive!, accent: HEX.inactive!, px, ph: px * 2 })
  body += sprite(bm, X, petY, { body: HEX.claude!, accent: HEX.suggestion!, px, ph: px * 2, blink: true })
  const tx = X + w + 24
  const t1 = petY + 12
  body += `<text x="${tx}" y="${t1}" font-family="${FONT}" font-size="14"><tspan fill="${HEX.text}" font-weight="700">Mochi</tspan><tspan fill="${HEX.claude}"> ★ </tspan><tspan fill="${HEX.planMode}">companion</tspan><tspan fill="${DIM}"> · lvl 6 blob · 128c</tspan></text>`
  body += text(tx, t1 + LH, '< tests pass!!', HEX.text!, 14)
  body += text(tx, t1 + LH * 2, '[########--] 1380/1500 xp', DIM, 14)

  // The prompt box.
  const py = petY + bm.length * px * 2 + 18
  body += `<rect x="${X - 8}" y="${py}" width="${W - 2 * X + 16}" height="40" rx="6" fill="none" stroke="#5A5A66"/>`
  body += text(X + 4, py + 25, '>', HEX.text!, 14)
  body += `<rect x="${X + 22}" y="${py + 11}" width="9" height="18" fill="${HEX.text}"><animate attributeName="opacity" values="1;1;0;0" dur="1.1s" repeatCount="indefinite"/></rect>`
  body += text(X, py + 62, '? for shortcuts', '#5E5E6A', 12)
  writeFileSync(join(OUT, 'terminal.svg'), svg(W, H, body, 'A pet above the Claude Code prompt, cheering for passing tests'))
}

// ---- evolution: every species through every stage ----
{
  const W = 960
  const ROW = 118
  const TOP = 70
  const LEFT = 120
  const H = TOP + ROW * SPECIES.length + 20
  const col = (W - LEFT - 20) / STAGES.length
  const px = 4
  let body = card(W, H)
  STAGES.forEach((stage, i) => {
    const cx = LEFT + col * i + col / 2
    body += text(cx, 34, stage, HEX[STAGE_COLOR[i]!]!, 15, 'text-anchor="middle" font-weight="700"')
    body += text(cx, 54, `level ${STAGE_LEVEL[i]}+`, DIM, 12, 'text-anchor="middle"')
    if (i > 0) body += text(LEFT + col * i, TOP + (ROW * SPECIES.length) / 2, '›', '#3E3E4A', 28, 'text-anchor="middle"')
  })
  SPECIES.forEach((sp, r) => {
    const cy = TOP + ROW * r + ROW / 2
    if (r > 0) body += `<line x1="24" y1="${TOP + ROW * r}" x2="${W - 24}" y2="${TOP + ROW * r}" stroke="${LINE}" stroke-dasharray="2 6"/>`
    body += text(32, cy + 5, sp, HEX[BODY[sp]]!, 15, 'font-weight="600"')
    STAGES.forEach((_, i) => {
      const bm = SPRITES[sp][i]
      const { w, h } = sizeOf(bm, px)
      const cx = LEFT + col * i + col / 2
      body += sprite(bm, cx - w / 2, cy - h / 2, { body: HEX[BODY[sp]]!, accent: HEX[ACCENT[sp]]!, px, ph: px * 2, blink: true })
    })
  })
  writeFileSync(join(OUT, 'evolution.svg'), svg(W, H, body, 'Each species evolving from hatchling to legend'))
}

// ---- hats: a sprite crab trying on everything in the shop ----
{
  const HATS = [
    { id: 'party', name: 'party hat', cost: 15, color: 'merged' },
    { id: 'tophat', name: 'top hat', cost: 30, color: 'inactive' },
    { id: 'halo', name: 'halo', cost: 40, color: 'warning' },
    { id: 'wizard', name: 'wizard hat', cost: 50, color: 'suggestion' },
    { id: 'crown', name: 'crown', cost: 60, color: 'warning' },
  ]
  const W = 960
  const H = 230
  const px = 5
  const gap = W / HATS.length
  let body = card(W, H)
  HATS.forEach((hat, i) => {
    const bm = SPRITES.ghost[1]
    const hb = HAT_ART[hat.id]
    const { w, h } = sizeOf(bm, px)
    const cx = gap * i + gap / 2
    const base = 150
    body += sprite(bm, cx - w / 2, base - h, { body: HEX.text!, accent: HEX.suggestion!, px, ph: px * 2, blink: true })
    body += sprite(hb, cx - (hb[0].length * px) / 2, base - h - hb.length * px * 2 - 2, { body: HEX[hat.color]!, accent: HEX[hat.color]!, px, ph: px * 2 })
    body += text(cx, base + 30, hat.name, HEX.text!, 14, 'text-anchor="middle" font-weight="600"')
    body += text(cx, base + 50, `${hat.cost} coins`, HEX.warning!, 13, 'text-anchor="middle"')
  })
  writeFileSync(join(OUT, 'hats.svg'), svg(W, H, body, 'The hats in the pet shop'))
}

// ---- moods: one blob through its moods ----
{
  const MOODS = [
    { name: 'calm', color: 'claude', mark: '', closed: false },
    { name: 'happy', color: 'claude', mark: '♪', closed: false },
    { name: 'proud', color: 'claude', mark: '★', closed: false },
    { name: 'worried', color: 'warning', mark: '?', closed: false },
    { name: 'scared', color: 'error', mark: '!', closed: false },
    { name: 'sleepy', color: 'claude', mark: 'z', closed: true },
  ]
  const W = 960
  const H = 190
  const px = 5
  const gap = W / MOODS.length
  let body = card(W, H)
  MOODS.forEach((mood, i) => {
    const bm = SPRITES.blob[1]
    const { w, h } = sizeOf(bm, px)
    const cx = gap * i + gap / 2
    const top = 30
    body += sprite(bm, cx - w / 2, top, { body: HEX[mood.color]!, accent: HEX.suggestion!, px, ph: px * 2, closed: mood.closed, blink: !mood.closed })
    if (mood.mark !== '') body += text(cx + w / 2 + 6, top + 8, mood.mark, HEX[mood.color]!, 16, 'font-weight="700"')
    body += text(cx, top + h + 34, mood.name, DIM, 14, 'text-anchor="middle"')
  })
  writeFileSync(join(OUT, 'moods.svg'), svg(W, H, body, 'The pet calm, happy, proud, worried, scared and sleepy'))
}

console.log('wrote', OUT)
