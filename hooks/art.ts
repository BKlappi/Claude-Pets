// The pets as pixel art, drawn with quadrant blocks: each text cell holds a
// 2x2 square of pixels. In a bitmap '#' is body, '*' accent, 's' eggshell,
// 'e' an eye (a hole while open; closed, its top pixel fills in) and '.'
// nothing. Eyes start on an even row, so each sits in one cell.

export type Kind = 'body' | 'accent' | 'shell'
export type Run = { kind: Kind; text: string }

export type SpeciesName = 'blob' | 'moth' | 'ghost' | 'crab' | 'sprout'

// hatchling 12x6, sprite 14x6, companion 18x8, legend 22x10 pixels; each eye
// a 2x2 square on even rows and columns, so it fills exactly one cell.
export const SPRITES: Record<SpeciesName, readonly (readonly string[])[]> = {
  blob: [
    ['....####....', '..########..', '.#ee####ee#.', '.#ee####ee#.', 's.ssssssss.s', '.ssssssssss.'],
    ['.....####.....', '...########...', '..##ee##ee##..', '.###ee##ee###.', '##############', '.##.##..##.##.'],
    [
      '........##........',
      '......######......',
      '....##########....',
      '...############...',
      '..####ee##ee####..',
      '.#####ee##ee#####.',
      '##################',
      '.###.###..###.###.',
    ],
    [
      '..........**..........',
      '.........****.........',
      '......##########......',
      '....##############....',
      '...#####ee##ee#####...',
      '..######ee##ee######..',
      '.####################.',
      '######################',
      '######################',
      '.###.###.####.###.###.',
    ],
  ],
  moth: [
    ['.#........#.', '..#.####.#..', '.#ee####ee#.', '##ee####ee##', 's.ssssssss.s', '.ssssssssss.'],
    ['..#........#..', '...#......#...', '##.#ee##ee#.##', '###*ee##ee*###', '.###*####*###.', '..##..##..##..'],
    [
      '...#..........#...',
      '....#........#....',
      '##...#......#...##',
      '###..########..###',
      '####*#ee##ee#*####',
      '####*#ee##ee#*####',
      '.####*######*####.',
      '..###..####..###..',
    ],
    [
      '....#............#....',
      '.....#..........#.....',
      '##....#.######.#....##',
      '###*...########...*###',
      '####**.#ee##ee#.**####',
      '#####**#ee##ee#**#####',
      '######*########*######',
      '.#####**######**#####.',
      '..####...####...####..',
      '...##....#..#....##...',
    ],
  ],
  ghost: [
    ['...######...', '.##########.', '.#ee####ee#.', '##ee####ee##', 's#s#ssss#s#s', '.ssssssssss.'],
    ['....######....', '..##########..', '.###ee##ee###.', '####ee##ee####', '.############.', '.#.##.##.##.#.'],
    [
      '......######......',
      '....##########....',
      '...############...',
      '..##############..',
      '.#####ee##ee#####.',
      '######ee##ee######',
      '.#######..#######.',
      '.#.###.####.###.#.',
    ],
    [
      '*.......######.......*',
      '.*....##########....*.',
      '..*.##############.*..',
      '...################...',
      '..######ee##ee######..',
      '.#######ee##ee#######.',
      '##########..##########',
      '##########..##########',
      '######################',
      '#.###.####..####.###.#',
    ],
  ],
  crab: [
    ['##........##', '.#.######.#.', '.#ee####ee#.', '##ee####ee##', 's.ssssssss.s', '.ssssssssss.'],
    ['##..........##', '#.#..####..#.#', '.###ee##ee###.', '..##ee##ee##..', '.############.', '#.#..#..#..#.#'],
    [
      '###............###',
      '#.##..........##.#',
      '##.#...####...#.##',
      '...##.######.##...',
      '....##ee##ee##....',
      '..####ee##ee####..',
      '.################.',
      '#.#.#..#..#..#.#.#',
    ],
    [
      '####..............####',
      '#..##............##..#',
      '##..#.....**.....#..##',
      '.####..*######*..####.',
      '....####ee##ee####....',
      '...#####ee##ee#####...',
      '..##################..',
      '.####################.',
      '.##..##..####..##..##.',
      '##...#...#..#...#...##',
    ],
  ],
  sprout: [
    ['..##....##..', '....####....', '.#ee####ee#.', '.#ee####ee#.', 's.ssssssss.s', '.ssssssssss.'],
    ['..###....###..', '....##..##....', '...#ee##ee#...', '..##ee##ee##..', '...########...', '....##..##....'],
    [
      '.###..........###.',
      '..####..**..####..',
      '....####**####....',
      '......######......',
      '.....#ee##ee#.....',
      '....##ee##ee##....',
      '.....########.....',
      '...###..##..###...',
    ],
    [
      '.....**...##...**.....',
      '...######.##.######...',
      '.#########**#########.',
      '..*######.##.######*..',
      '.......#ee##ee#.......',
      '......##ee##ee##......',
      '.......########.......',
      '.........####.........',
      '......###.##.###......',
      '....###...##...###....',
    ],
  ],
}

// The first egg, whole and then cracking, drawn on alternate ticks.
export const EGG_ART: readonly (readonly string[])[] = [
  ['...####...', '..######..', '.########.', '.########.', '.########.', '..######..'],
  ['...####...', '..##.###..', '.###.####.', '.####.###.', '.########.', '..######..'],
]

// Hats sit above the pet, every pixel in the hat's own color.
export const HAT_ART: Record<string, readonly string[]> = {
  party: ['......', '..**..', '.****.', '******'],
  tophat: ['.****.', '.****.', '******', '......'],
  halo: ['.****.', '*....*', '.****.', '......'],
  wizard: ['....**', '...**.', '..***.', '******'],
  crown: ['*.**.*', '******'],
}

// Bit order of a cell's pixels: top left, top right, bottom left, bottom right.
const QUADRANTS = [' ', '▗', '▖', '▄', '▝', '▐', '▞', '▟', '▘', '▚', '▌', '▙', '▀', '▜', '▛', '█']

const isFilled = (pixel: string | undefined, row: number, isClosed: boolean) =>
  pixel === '#' || pixel === '*' || pixel === 's' || (pixel === 'e' && isClosed && row % 2 === 0)

// Turns a bitmap into rows of colored runs, one character per 2x2 pixels.
export function draw(bitmap: readonly string[], isClosed = false): Run[][] {
  const width = Math.max(...bitmap.map(row => row.length))
  const rows: Run[][] = []
  for (let y = 0; y < bitmap.length; y += 2) {
    const runs: Run[] = []
    for (let x = 0; x < width; x += 2) {
      const pixels = [
        { pixel: bitmap[y]?.[x], row: y },
        { pixel: bitmap[y]?.[x + 1], row: y },
        { pixel: bitmap[y + 1]?.[x], row: y + 1 },
        { pixel: bitmap[y + 1]?.[x + 1], row: y + 1 },
      ]
      const bits = pixels.reduce((sum, { pixel, row }, i) => sum + (isFilled(pixel, row, isClosed) ? 8 >> i : 0), 0)
      const kind: Kind = pixels.some(p => p.pixel === '*')
        ? 'accent'
        : pixels.some(p => p.pixel === 's')
          ? 'shell'
          : 'body'
      const char = QUADRANTS[bits] ?? ' '
      const last = runs[runs.length - 1]
      if (last !== undefined && (last.kind === kind || char === ' ')) last.text += char
      else runs.push({ kind, text: char })
    }
    rows.push(runs)
  }
  return rows
}

export const widthOf = (rows: Run[][]) => rows[0]?.reduce((sum, run) => sum + run.text.length, 0) ?? 0
