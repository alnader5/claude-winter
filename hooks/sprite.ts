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

// The pom-pom on its slouched crown, lagging a pixel behind each move: behind as it
// goes right or left, down as it springs up, up as it falls.
export const POM = {
  still: [[14, -2, 2, 1]],
  left: [[13, -2, 2, 1]],
  right: [[15, -2, 2, 1]],
  low: [[14, -1, 2, 1]],
  high: [[14, -3, 2, 1]],
} as const satisfies Record<string, readonly Rect[]>

export type Pom = keyof typeof POM

// Snow kicked up about its feet as it lands, then spreading.
export const DUST = {
  dust1: [
    [2, 9, 1, 1],
    [15, 9, 1, 1],
  ],
  dust2: [
    [0, 8, 1, 1],
    [17, 8, 1, 1],
    [1, 9, 1, 1],
    [16, 9, 1, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

export type Dust = keyof typeof DUST | 'none'

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
  // Holding a book open by its sides.
  hold: [
    [2, 5, 2, 2],
    [14, 5, 2, 2],
  ],
  // The right hand on a lever's knob, pulling it up and pushing it down.
  pullUp: [
    [1, 4, 2, 2],
    [14, 2, 2, 2],
  ],
  pullDown: [
    [1, 4, 2, 2],
    [14, 4, 2, 2],
  ],
  // Holding binoculars up to the eyes.
  scope: [
    [2, 2, 2, 2],
    [14, 2, 2, 2],
  ],
  // A hand raised high, as a pupil's is, waving a little: there is a question.
  hand: [
    [1, 4, 2, 2],
    [15, 0, 2, 2],
    [16, -1, 1, 1],
  ],
  hand2: [
    [1, 4, 2, 2],
    [16, 0, 2, 2],
    [17, -1, 1, 1],
  ],
  // Scratching its head over a question: the left hand at the side of the hat, rubbing
  // up and down.
  scratch1: [
    [1, 0, 2, 2],
    [15, 4, 2, 2],
  ],
  scratch2: [
    [1, 1, 2, 2],
    [15, 4, 2, 2],
  ],
  // Sitting still to focus: the hands resting low on its knees.
  calm: [
    [1, 6, 2, 1],
    [15, 6, 2, 1],
  ],
  // Shoveling: both hands low on the handle to dig, then up by its head to heave the
  // snow away.
  dig: [
    [13, 6, 2, 1],
    [15, 5, 2, 2],
  ],
  heave: [
    [1, 2, 2, 2],
    [3, 1, 2, 2],
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
  // Reading a line on the pages below, left to right.
  readL: [
    [4, 3, 1, 2],
    [11, 3, 1, 2],
  ],
  readR: [
    [6, 3, 1, 2],
    [13, 3, 1, 2],
  ],
  // Behind binoculars.
  none: [],
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

// The other things the character works with, each held or set in front of its body as
// the laptop is, and shown while Claude is busy at the matching kind of tool.

// Reading files: a book held open, its lines read a page at a time, a page turning.
export const BOOK_BLUE = '#3e6fb0'
export const PAGE = '#f3ead6'
export const INK = '#8a8f99'
export const BOOK = {
  cover: [
    [4, 5, 1, 3],
    [13, 5, 1, 3],
    [4, 8, 10, 1],
  ],
  pages: [[5, 5, 8, 3]],
} as const satisfies Record<string, readonly Rect[]>

export const BOOK_LINES = {
  p1: [
    [6, 6, 2, 1],
    [10, 6, 2, 1],
    [6, 7, 1, 1],
    [10, 7, 2, 1],
  ],
  p2: [
    [6, 6, 1, 1],
    [10, 6, 1, 1],
    [6, 7, 2, 1],
    [10, 7, 1, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

// A page lifting over the book as it turns.
export const BOOK_TURN = {
  turn: [[9, 4, 3, 1]],
} as const satisfies Record<string, readonly Rect[]>

export type Book = keyof typeof BOOK_LINES | 'turn' | 'none'

// Running a command: a little terminal box with a green screen, worked with a lever.
export const BOX_DARK = '#2b2f36'
export const SCREEN_DARK = '#16261c'
export const TERMINAL_GREEN = '#4ade80'
export const KNOB_RED = '#e5484d'
export const BOX = {
  body: [[5, 5, 8, 5]],
  screen: [[6, 6, 6, 2]],
} as const satisfies Record<string, readonly Rect[]>

// The screen's lines, scrolling a line at each pull.
export const SCREEN = {
  s1: [
    [6, 6, 1, 1],
    [8, 6, 3, 1],
    [6, 7, 2, 1],
  ],
  s2: [
    [6, 6, 2, 1],
    [6, 7, 1, 1],
    [8, 7, 3, 1],
  ],
  s3: [
    [6, 6, 1, 1],
    [8, 6, 2, 1],
    [6, 7, 3, 1],
    [10, 7, 1, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

// The lever beside the box, up and pulled down, and its knob.
export const LEVER = {
  up: [[13, 3, 1, 3]],
  down: [[13, 5, 1, 1]],
} as const satisfies Record<string, readonly Rect[]>

export const KNOB = {
  up: [[13, 2, 1, 1]],
  down: [[13, 4, 1, 1]],
} as const satisfies Record<string, readonly Rect[]>

export type Box = keyof typeof LEVER | 'none'
export type Screen = keyof typeof SCREEN | 'none'

// Searching the web: binoculars over the eyes, turned left, ahead and right, a glint
// on each lens.
export const SCOPE_LENS_BLUE = '#9cc7e8'
export const SCOPE = {
  left: [
    [3, 2, 3, 2],
    [10, 2, 3, 2],
    [6, 3, 4, 1],
  ],
  ahead: [
    [4, 2, 3, 2],
    [11, 2, 3, 2],
    [7, 3, 4, 1],
  ],
  right: [
    [5, 2, 3, 2],
    [12, 2, 3, 2],
    [8, 3, 4, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

export const SCOPE_LENS = {
  left: [
    [3, 2, 1, 1],
    [10, 2, 1, 1],
  ],
  ahead: [
    [5, 2, 1, 1],
    [12, 2, 1, 1],
  ],
  right: [
    [7, 2, 1, 1],
    [14, 2, 1, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

export type Scope = keyof typeof SCOPE | 'none'

// Editing files: "<>" flying off the laptop up toward the spark, a step at a time.
export const CODE_BLUE = '#6cb6ff'
const GLYPH: readonly string[] = ['.#.#.', '#...#', '.#.#.']

function glyphAt(column: number, row: number): Rect[] {
  const rects: Rect[] = []

  GLYPH.forEach((line, dy) => {
    for (let dx = 0; dx < line.length; dx++) {
      if (line[dx] === '#') {
        rects.push([column + dx, row + dy, 1, 1])
      }
    }
  })

  return rects
}

export const GLYPHS = {
  g1: glyphAt(14, 2),
  g2: glyphAt(16, -1),
  g3: glyphAt(18, -4),
} as const satisfies Record<string, readonly Rect[]>

export type Glyph = keyof typeof GLYPHS | 'none'

// Claude's helpers, one for each agent it sends off: small creatures of the same
// orange in hats of their own colors, each carrying a parcel back and forth. On a grid
// of 8 by 5 pixels.
export const HELPER_HATS: readonly string[] = ['#3e9be0', '#2f9e5b', '#7b5cd6']
export const PARCEL = '#e8d9b5'
export const HELPER = {
  hat: [[1, 0, 6, 1]],
  body: [[0, 1, 8, 3]],
  eyes: [
    [2, 2, 1, 1],
    [5, 2, 1, 1],
  ],
  parcel: [[2, -2, 4, 2]],
} as const satisfies Record<string, readonly Rect[]>

export const HELPER_LEGS = {
  a: [
    [1, 4, 1, 1],
    [6, 4, 1, 1],
  ],
  b: [
    [2, 4, 1, 1],
    [5, 4, 1, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

// The prompt the person sends, as a paper plane flying nose first to the left: a white
// wing, edged by its folds so it shows on a snowy page too. Then, caught, unfolded into
// a note held up to read.
export const PAPER = '#f7f9fc'
export const FOLD = '#8aa0b8'
export const PLANE = {
  wing: [[3, 1, 3, 1]],
  fold: [
    [5, 0, 2, 1],
    [6, 1, 1, 1],
    [0, 2, 6, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

export const NOTE = {
  paper: [[5, 4, 8, 3]],
  lines: [
    [6, 5, 5, 1],
    [6, 6, 3, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

// Cheeks gone pink under the eyes, for thanks and praise.
export const BLUSH_PINK = '#f28b98'
export const BLUSH: readonly Rect[] = [
  [4, 4, 2, 1],
  [12, 4, 2, 1],
]

// A bead of sweat flying off the left of its head, in a hurry.
export const SWEAT_BLUE = '#7cc4f2'
export const SWEAT = {
  drop1: [[1, -1, 1, 1]],
  drop2: [[0, 0, 1, 2]],
  drop3: [[-1, 2, 1, 1]],
} as const satisfies Record<string, readonly Rect[]>

export type Sweat = keyof typeof SWEAT | 'none'

// What the spark throws about at home, around its own center. Sneezing, a spray of
// sparks toward the character; diving into the snow or popping out of it, snow kicked
// up from the ground under it.
export const SNEEZE = {
  sneeze1: [
    [-7, -2, 1, 1],
    [-6, 0, 1, 1],
    [-8, -4, 1, 1],
  ],
  sneeze2: [
    [-10, -3, 1, 1],
    [-9, 1, 1, 1],
    [-11, -1, 1, 1],
  ],
  sneeze3: [
    [-12, -4, 1, 1],
    [-13, 0, 1, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

export const KICK = {
  snow1: [
    [-3, 4, 1, 1],
    [2, 4, 1, 1],
    [0, 3, 1, 1],
  ],
  snow2: [
    [-5, 2, 1, 1],
    [4, 2, 1, 1],
    [-1, 1, 1, 1],
    [2, 0, 1, 1],
  ],
  snow3: [
    [-7, 1, 1, 1],
    [6, 1, 1, 1],
    [-3, -2, 1, 1],
    [3, -3, 1, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

export type Burst = keyof typeof SNEEZE | keyof typeof KICK | 'none'

// The bell at the end of a focus session, hung over the spark: gold, with a dark
// clapper, and the lines of its ring on either side, now one pair and now the other.
export const BELL_GOLD = '#e0a82e'
export const BELL = {
  body: [
    [2, 0, 2, 1],
    [1, 1, 4, 2],
    [0, 3, 6, 1],
  ],
  clapper: [[2, 4, 2, 1]],
} as const satisfies Record<string, readonly Rect[]>

export const RING = {
  near: [
    [-2, 1, 1, 1],
    [7, 1, 1, 1],
  ],
  far: [
    [-3, 3, 1, 1],
    [8, 3, 1, 1],
    [-2, -1, 1, 1],
    [7, -1, 1, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

// Git: a flag held high and waved for a commit, its pennant fluttering; a snowball
// thrown up out of the band for a push, and a star where it went.
export const GIT_FLAG = {
  pole: [[16, -6, 1, 8]],
  wave1: [[17, -6, 4, 2]],
  wave2: [
    [17, -5, 4, 2],
    [20, -6, 1, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

export const SNOWBALL = {
  ball: [
    [0, 0, 2, 2],
  ],
  shade: [[1, 1, 1, 1]],
} as const satisfies Record<string, readonly Rect[]>

export const TWINKLE = {
  big: [
    [1, 0, 1, 3],
    [0, 1, 3, 1],
  ],
  small: [[1, 1, 1, 1]],
} as const satisfies Record<string, readonly Rect[]>

export type Twinkle = keyof typeof TWINKLE | 'none'

// The flags of a long turn, one a minute along the snow: a small one on a stick, and the
// big one planted at the end of a long turn answered, a star on it, flying.
export const TREK_FLAG = {
  pole: [[0, 0, 1, 6]],
  flag: [[1, 0, 3, 2]],
} as const satisfies Record<string, readonly Rect[]>

export const SUMMIT_FLAG = {
  pole: [[0, 0, 1, 10]],
  fly1: [[1, 0, 5, 3]],
  fly2: [
    [1, 1, 5, 2],
    [1, 0, 3, 1],
  ],
  star: [[3, 1, 1, 1]],
} as const satisfies Record<string, readonly Rect[]>

// The shovel, dug into the snow at its right, then heaved up over its head with a load
// of snow on the blade; and the snow flung off it, up and away to the left. All of it
// on the band, even at home by its left edge.
export const SHOVEL = {
  dig: [
    [17, 5, 1, 1],
    [18, 6, 1, 1],
    [19, 7, 1, 1],
    [20, 8, 1, 1],
  ],
  heave: [[4, -2, 1, 3]],
} as const satisfies Record<string, readonly Rect[]>

export const BLADE = {
  dig: [[19, 9, 3, 1]],
  heave: [[3, -3, 3, 1]],
} as const satisfies Record<string, readonly Rect[]>

export const LOAD = {
  heave: [[3, -5, 3, 2]],
} as const satisfies Record<string, readonly Rect[]>

export const FLUNG = {
  flung: [
    [1, -6, 1, 1],
    [-1, -4, 1, 1],
    [2, -7, 1, 1],
    [0, -7, 1, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

export type Shovel = keyof typeof SHOVEL | 'none'

// A little blue penguin, facing left: its slate back and white front, a dark eye, an
// orange beak and feet that take turns as it waddles; flat on its belly to slide on
// the ice or duck; a flipper up to throw.
export const PENGUIN_SLATE = '#3d5a73'
export const PENGUIN_ORANGE = '#f2a33a'
export const PENGUIN = {
  back: [
    [2, 0, 3, 1],
    [1, 1, 5, 6],
    [0, 4, 1, 2],
    [6, 4, 1, 2],
  ],
  belly: [[2, 2, 3, 5]],
  eye: [[2, 1, 1, 1]],
  beak: [[0, 2, 1, 1]],
} as const satisfies Record<string, readonly Rect[]>

export const PENGUIN_FEET = {
  a: [
    [1, 7, 2, 1],
    [4, 7, 1, 1],
  ],
  b: [
    [2, 7, 1, 1],
    [4, 7, 2, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

export const PENGUIN_FLAT = {
  back: [
    [1, 5, 6, 1],
    [0, 6, 8, 2],
  ],
  belly: [[1, 7, 6, 1]],
  eye: [[1, 6, 1, 1]],
  beak: [[-1, 6, 1, 1]],
} as const satisfies Record<string, readonly Rect[]>

export const PENGUIN_THROW = {
  back: [
    [2, 0, 3, 1],
    [1, 1, 5, 6],
    [0, 1, 1, 2],
    [6, 4, 1, 2],
  ],
  ball: [[0, -1, 1, 1]],
} as const satisfies Record<string, readonly Rect[]>

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

// The snowman as it is built, a part a day: the big ball below, then the head on it,
// its coal eyes and buttons, the carrot, the stick arms, and its top hat. Together they
// are the whole snowman above, pixel for pixel.
export const SNOWMAN_PARTS = {
  body: [
    [1, 5, 6, 1],
    [0, 6, 8, 3],
    [1, 9, 6, 1],
  ],
  bodyShade: [
    [6, 5, 1, 1],
    [7, 6, 1, 3],
    [6, 9, 1, 1],
  ],
  head: [
    [2, 0, 4, 1],
    [1, 1, 6, 3],
    [2, 4, 4, 1],
  ],
  headShade: [
    [6, 1, 1, 3],
    [5, 4, 1, 1],
  ],
  face: [
    [2, 2, 1, 1],
    [4, 2, 1, 1],
    [3, 6, 1, 1],
    [3, 8, 1, 1],
  ],
  hat: [
    [2, -3, 4, 2],
    [1, -1, 6, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

// What it is given as the answers add up: a red scarf, a broom held at its side, and a
// gold star on its hat.
export const STRAW = '#c9a35c'
export const SNOWMAN_GIFTS = {
  scarf: [
    [1, 4, 6, 1],
    [5, 5, 1, 2],
  ],
  scarfStripe: [
    [3, 4, 1, 1],
    [5, 6, 1, 1],
  ],
  broomStick: [[-3, 1, 1, 7]],
  broomStraw: [
    [-4, 8, 3, 1],
    [-4, 9, 3, 1],
  ],
  star: [
    [3, -6, 1, 3],
    [2, -5, 3, 1],
  ],
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

// For New Year: a paper party hat at a slant on the right of the head, in place of the
// knitted one, striped gold on purple.
export const PARTY_PURPLE = '#7b5cd6'
export const PARTY_GOLD = '#f2c94c'
export const PARTY_HAT = {
  cone: [
    [9, 0, 6, 1],
    [10, -1, 4, 1],
    [12, -2, 2, 1],
  ],
  stripes: [
    [11, 0, 1, 1],
    [13, 0, 1, 1],
    [12, -1, 1, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>

// For New Year too: confetti, in these colors.
export const CONFETTI: readonly string[] = ['#e5484d', '#f2c94c', '#3e9be0', '#2f9e5b', '#7b5cd6']

// For Ramadan: a lantern hanging over the track, its glass lit and flickering.
export const LANTERN_GOLD = '#b8862b'
export const LANTERN_GLOW = '#ffd36b'
export const LANTERN = {
  frame: [
    [2, 0, 1, 1],
    [1, 1, 3, 1],
    [0, 2, 5, 1],
    [0, 3, 1, 2],
    [4, 3, 1, 2],
    [0, 5, 5, 1],
    [1, 6, 3, 1],
  ],
  glass: [[1, 3, 3, 2]],
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
  // Asleep: a small z, then a big Z above it, then the big one alone.
  z1: ['........', '........', '........', '###.....', '.#......', '###.....'],
  z2: ['....####', '......#.', '.....#..', '###.####', '.#......', '###.....'],
  z3: ['....####', '......#.', '.....#..', '....####', '........', '........'],
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
