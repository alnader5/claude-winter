// Claude's pixel character, the orange creature of Claude Code's welcome screen, on a
// grid of 18 by 10 square pixels, each UNIT CSS pixels across: a wide body, two tall
// eyes, an arm on each side and four short legs. While Claude works it has a laptop.
//
// Each part comes in the variants a frame can show. The band switches whole variants
// on and off, as a sprite sheet does, so every move lands on the grid.

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

// [column, row, width, height], in pixels of the grid.
export type Rect = readonly [number, number, number, number]

export const BODY: readonly Rect[] = [[3, 0, 12, 8]]

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
} as const satisfies Record<string, readonly Rect[]>

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
  // Thinking.
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

// The shadow on the ground, narrower the higher it jumps.
export const SHADOW = {
  wide: [[2, 9, 14, 1]],
  mid: [[4, 9, 10, 1]],
  small: [[6, 9, 6, 1]],
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
