// Claude's pixel character, the orange creature of Claude Code's welcome screen, on a
// grid of 18 by 10 square pixels, each UNIT CSS pixels across: a wide body, two tall
// eyes, an arm on each side and four short legs. For the winter it wears a knitted hat
// and a striped scarf, and while Claude works it has a laptop.
//
// Each part comes in the variants a frame can show. The band switches whole variants
// on and off, as a sprite sheet does, so every move lands on the grid. The band's
// other pixel things are drawn on the same grid: the snowman, a robin and a snowflake.

export const UNIT = 2
export const SPRITE_WIDTH = 18 * UNIT
export const SPRITE_HEIGHT = 10 * UNIT

export const ORANGE = '#d97757'
export const EYE = '#1d1714'
export const HEART = '#e5484d'
export const SHADE = '#0b1220'
// The laptop's two grays, and the green of the tick it shows when the work is done:
// each clear of a light background and of a dark one.
export const LID_GRAY = '#93a3b6'
export const HINGE_GRAY = '#64748b'
export const TICK = '#2f9e5b'
// The knitted things: a deep red that stands apart from the orange, a pink for the
// hat's cuff and pom-pom, and the scarf's pale stripes.
export const KNIT_RED = '#c23a45'
export const KNIT_PINK = '#ef8a92'
export const STRIPE = '#f6d2d5'
// Breath in the cold air.
export const BREATH_GRAY = '#d3dfeb'
// The snowman: snow and its shading, coal, a carrot and two sticks.
export const SNOW_WHITE = '#f4f8fc'
export const SNOW_SHADE = '#b3c3d5'
export const COAL = '#2b2f36'
export const CARROT = '#e8833a'
export const STICK = '#7a5536'
// A robin.
export const ROBIN_BROWN = '#6e5240'
export const ROBIN_RED = '#e0623a'
export const BEAK = '#e9b13b'
// The snowflake that lands on the spark.
export const FLAKE_BLUE = '#9cbad6'

// [column, row, width, height], in pixels of the grid.
export type Rect = readonly [number, number, number, number]

export const BODY: readonly Rect[] = [[3, 0, 12, 8]]

// The hat sits on the top two rows of the body, its crown slouched to one side with a
// pom-pom on the end, clear of what the character says over its head.
export const HAT = {
  crown: [
    [3, 0, 12, 1],
    [12, -1, 3, 1],
  ],
  cuff: [[3, 1, 12, 1]],
  pom: [[14, -2, 2, 1]],
} as const satisfies Record<string, readonly Rect[]>

// The scarf goes round under the eyes, below where the laptop's lid comes up to.
export const SCARF_WRAP: readonly Rect[] = [[3, 5, 12, 1]]
export const SCARF_STRIPES: readonly Rect[] = [
  [5, 5, 1, 1],
  [9, 5, 1, 1],
  [13, 5, 1, 1],
]

// The scarf's end: hanging in front while the character stands, and streaming out
// behind an arm while it moves, its tip flapping up and down a frame at a time.
export const SCARF_TAIL = {
  still: [[11, 6, 2, 2]],
  blowL1: [
    [-2, 5, 3, 1],
    [-3, 4, 1, 1],
  ],
  blowL2: [
    [-2, 5, 3, 1],
    [-3, 6, 1, 1],
  ],
  blowR1: [
    [17, 5, 3, 1],
    [20, 4, 1, 1],
  ],
  blowR2: [
    [17, 5, 3, 1],
    [20, 6, 1, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

export const SCARF_TAIL_STRIPE = {
  still: [[11, 7, 2, 1]],
  blowL1: [[-1, 5, 1, 1]],
  blowL2: [[-1, 5, 1, 1]],
  blowR1: [[18, 5, 1, 1]],
  blowR2: [[18, 5, 1, 1]],
} as const satisfies Record<keyof typeof SCARF_TAIL, readonly Rect[]>

// Drawn with the body, so they sink with it when it crouches.
export const ARMS = {
  rest: [
    [1, 4, 2, 2],
    [15, 4, 2, 2],
  ],
  up: [
    [1, 2, 2, 2],
    [15, 2, 2, 2],
  ],
  // Swung while it walks: one arm a pixel up as the other goes a pixel down.
  a: [
    [1, 3, 2, 2],
    [15, 5, 2, 2],
  ],
  b: [
    [1, 5, 2, 2],
    [15, 3, 2, 2],
  ],
  // Typing: one hand a pixel down on the keys, then the other.
  tapL: [
    [1, 5, 2, 2],
    [15, 4, 2, 2],
  ],
  tapR: [
    [1, 4, 2, 2],
    [15, 5, 2, 2],
  ],
  // Held out straight for balance, sliding on the ice.
  out: [
    [0, 4, 3, 1],
    [15, 4, 3, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

// Waving at whoever has the pointer over the band: the right arm up, then out.
export const WAVE = {
  a: [
    [1, 4, 2, 2],
    [15, 1, 2, 2],
  ],
  b: [
    [1, 4, 2, 2],
    [16, 2, 2, 2],
  ],
} as const satisfies Record<string, readonly Rect[]>

// A patch of body over where the eyes are, so happy eyes can be drawn on it.
export const FACE: readonly Rect[] = [[4, 2, 10, 2]]

export const EYES = {
  ahead: [
    [5, 2, 1, 2],
    [12, 2, 1, 2],
  ],
  left: [
    [4, 2, 1, 2],
    [11, 2, 1, 2],
  ],
  right: [
    [6, 2, 1, 2],
    [13, 2, 1, 2],
  ],
  shut: [
    [5, 3, 1, 1],
    [12, 3, 1, 1],
  ],
  // On the screen, and shut while on it.
  down: [
    [5, 3, 1, 2],
    [12, 3, 1, 2],
  ],
  downShut: [
    [5, 4, 1, 1],
    [12, 4, 1, 1],
  ],
  // Thinking, or watching something overhead.
  up: [
    [5, 1, 1, 2],
    [12, 1, 1, 2],
  ],
  // ^ ^
  happy: [
    [4, 3, 1, 1],
    [5, 2, 1, 1],
    [6, 3, 1, 1],
    [11, 3, 1, 1],
    [12, 2, 1, 1],
    [13, 3, 1, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

// On the ground under the body.
export const LEGS = {
  stand: [
    [4, 8, 1, 2],
    [6, 8, 1, 2],
    [11, 8, 1, 2],
    [13, 8, 1, 2],
  ],
  // A scuttle: two legs on the ground while the other two lift a pixel.
  a: [
    [4, 8, 1, 2],
    [6, 8, 1, 1],
    [11, 8, 1, 2],
    [13, 8, 1, 1],
  ],
  b: [
    [4, 8, 1, 1],
    [6, 8, 1, 2],
    [11, 8, 1, 1],
    [13, 8, 1, 2],
  ],
  // Squashed under a crouching body.
  tuck: [
    [4, 9, 1, 1],
    [6, 9, 1, 1],
    [11, 9, 1, 1],
    [13, 9, 1, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

// The shadow on the snow under the feet, narrower the higher it jumps.
export const SHADOW = {
  wide: [[2, 10, 14, 1]],
  mid: [[4, 10, 10, 1]],
  small: [[6, 10, 6, 1]],
} as const satisfies Record<string, readonly Rect[]>

// Puffs of breath, drifting up from the side of its face after a run.
export const BREATH = {
  puff1: [[17, 4, 1, 1]],
  puff2: [
    [17, 3, 2, 1],
    [18, 2, 1, 1],
  ],
  puff3: [
    [18, 0, 1, 1],
    [19, 1, 1, 1],
    [20, 2, 1, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

// The laptop, seen from behind as the character types at it: the lid stands in front
// of the body between its outer legs, the hinge on the ground. It comes up open out of
// the snow; when the work is done it folds shut and goes in a puff.
export const LID = {
  closed: [[5, 8, 8, 1]],
  half: [[5, 7, 8, 2]],
  open: [[5, 5, 8, 4]],
  poof: [
    [4, 7, 1, 1],
    [7, 6, 1, 1],
    [10, 6, 1, 1],
    [13, 7, 1, 1],
    [3, 9, 1, 1],
    [8, 8, 2, 1],
    [14, 9, 1, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

export const HINGE = {
  down: [[5, 9, 8, 1]],
} as const satisfies Record<string, readonly Rect[]>

// The orange mark on the lid, squashed as the lid is.
export const LOGO = {
  half: [[8, 7, 2, 1]],
  open: [[8, 6, 2, 2]],
} as const satisfies Record<string, readonly Rect[]>

export type Laptop = keyof typeof LID | 'none'

// The snowman, on the grid of the character's own size and standing on the same snow:
// a top hat, a head with coal eyes and a carrot pointing right, a round body with two
// coal buttons, and shading down its right side so it shows on a white page too.
export const SNOWMAN = {
  snow: [
    [2, 0, 4, 1],
    [1, 1, 6, 3],
    [2, 4, 4, 1],
    [1, 5, 6, 1],
    [0, 6, 8, 3],
    [1, 9, 6, 1],
  ],
  shade: [
    [6, 1, 1, 3],
    [5, 4, 1, 1],
    [6, 5, 1, 1],
    [7, 6, 1, 3],
    [6, 9, 1, 1],
  ],
  coal: [
    [2, -3, 4, 2],
    [1, -1, 6, 1],
    [2, 2, 1, 1],
    [4, 2, 1, 1],
    [3, 6, 1, 1],
    [3, 8, 1, 1],
  ],
  carrot: [[4, 3, 4, 1]],
} as const satisfies Record<string, readonly Rect[]>

// Its stick arms: the left one still, the right one lifted to wave back.
export const SNOWMAN_ARMS = {
  rest: [
    [-1, 5, 1, 1],
    [-2, 5, 1, 1],
    [-3, 4, 1, 1],
    [8, 5, 2, 1],
    [10, 4, 1, 1],
  ],
  wave: [
    [-1, 5, 1, 1],
    [-2, 5, 1, 1],
    [-3, 4, 1, 1],
    [8, 5, 1, 1],
    [9, 4, 1, 1],
    [10, 3, 1, 1],
    [11, 2, 1, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

// A robin facing right, in four poses: two wingbeats, perched, and pecking. Its
// colors are drawn one at a time, so each is a table of the poses.
export const ROBIN_BACK = {
  fly1: [
    [1, 0, 2, 1],
    [-1, 1, 2, 1],
    [0, -1, 1, 1],
  ],
  fly2: [
    [1, 0, 2, 1],
    [-1, 1, 2, 1],
    [0, 2, 1, 1],
  ],
  perch: [
    [1, 0, 2, 1],
    [-1, 1, 2, 1],
  ],
  peck: [
    [2, 0, 2, 1],
    [-1, 1, 2, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

export const ROBIN_BREAST = {
  fly1: [[1, 1, 2, 1]],
  fly2: [[1, 1, 2, 1]],
  perch: [[1, 1, 2, 1]],
  peck: [[1, 1, 2, 1]],
} as const satisfies Record<keyof typeof ROBIN_BACK, readonly Rect[]>

export const ROBIN_BEAK = {
  fly1: [[3, 0, 1, 1]],
  fly2: [[3, 0, 1, 1]],
  perch: [[3, 0, 1, 1]],
  peck: [[4, 1, 1, 1]],
} as const satisfies Record<keyof typeof ROBIN_BACK, readonly Rect[]>

export const ROBIN_FEET = {
  perch: [[1, 2, 1, 1]],
  peck: [[1, 2, 1, 1]],
} as const satisfies Partial<Record<keyof typeof ROBIN_BACK, readonly Rect[]>>

// The snowflake whole, and the last bit of it as it is flicked away.
export const FLAKE = {
  whole: [
    [1, 0, 1, 1],
    [0, 1, 3, 1],
    [1, 2, 1, 1],
  ],
  bit: [[1, 1, 1, 1]],
} as const satisfies Record<string, readonly Rect[]>

// What it says, in pixels over its head: rows of '#', all of one width.
export const SAY = {
  alert: ['##', '##', '##', '..', '##'],
  ask: ['.##.', '#..#', '..#.', '....', '..#.'],
  love: ['##..##', '######', '######', '.####.', '..##..'],
  // Thinking: the dots come one at a time.
  think1: ['#....'],
  think2: ['#.#..'],
  think3: ['#.#.#'],
  // The work is done.
  done: ['.....#', '....#.', '#..#..', '.##...'],
} as const satisfies Record<string, readonly string[]>

export function pathOf(rects: readonly Rect[]): string {
  return rects
    .map(([column, row, width, height]) => {
      return `M${column * UNIT} ${row * UNIT}h${width * UNIT}v${height * UNIT}h${-width * UNIT}z`
    })
    .join('')
}

// A balloon's rows as rectangles, a run of '#' at a time: centered on the body, its
// last row a pixel clear of the head. One of an odd width sits half a grid pixel off
// the grid, still on a whole CSS pixel, so it stays sharp.
export function balloonOf(rows: readonly string[]): Rect[] {
  const width = rows[0]?.length ?? 0
  const left = 9 - width / 2
  const top = -1 - rows.length
  const rects: Rect[] = []

  rows.forEach((line, row) => {
    let start = -1

    for (let column = 0; column <= line.length; column++) {
      const isFilled = line[column] === '#'

      if (isFilled && start < 0) {
        start = column
      } else if (!isFilled && start >= 0) {
        rects.push([left + start, top + row, column - start, 1])
        start = -1
      }
    }
  })

  return rects
}
