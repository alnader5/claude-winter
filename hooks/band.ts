// The row above the prompt: Claude's pixel character and the small orange spark share
// one snowy track, as wide as the band is drawn. The spark moves smoothly. The character
// moves the way an old game's sprite does, its limbs a whole frame at a time, twelve
// frames a second, on a grid of pixels. It wears a knitted hat and a striped scarf,
// whose end streams behind it as it moves.
//
// The band has a mood, and each mood is a reel: an intro played once, then a loop.
//
// - idle, the chase: at home beside the spark, a snowflake drifts down onto the spark,
//   which shakes it off. The spark rolls off to the far end; the character starts
//   ("!"), scuttles after it, puffs in the cold and pounces, and the spark darts back
//   home under the jump, shedding sparks. Puzzled ("?"), the character walks home: it
//   slides across the ice with its arms out, waves to the snowman, who waves back, and
//   greets the spark with a heart. Its footprints melt slowly in the snow.
// - working, while Claude works: "!", a laptop comes up out of the snow, and the
//   character types, stops to think ("..."), glances at the spark and types on; a robin
//   comes down onto its hat for a while. The spark winds up into a whirl and glows.
// - joy, puzzled and closing, as a turn ends with an answer, without one, or stopped:
//   the character folds the laptop away and cheers with a tick, wonders ("?") or just
//   stands, while the spark spins down. Then the chase starts over.
// - sleep, late at night with nothing to do: it dozes in the snow, z's over its head.
//
// The width: the app tells a hook the band's width in cells of text, not in pixels, but
// the drawing's own frame knows its width in pixels. So the drawing reads it in its CSS
// (`--w`), and every place along the track is a number of pixels plus a share of that
// width. The frames are timed for REFERENCE_WIDTH: a wider band is crossed faster, a
// narrower one slower, and everything else keeps its time.

import {
  ARMS,
  BEAK,
  BODY,
  BOOK,
  BOOK_BLUE,
  BOOK_LINES,
  BOOK_TURN,
  BOX,
  BOX_DARK,
  BREATH,
  BREATH_GRAY,
  CARROT,
  CODE_BLUE,
  COAL,
  CONFETTI,
  EYE,
  EYES,
  FACE,
  FLAKE,
  FLAKE_BLUE,
  GLYPHS,
  HAT,
  HEART,
  HELPER,
  HELPER_HATS,
  HELPER_LEGS,
  HINGE,
  HINGE_GRAY,
  INK,
  KNIT_PINK,
  KNIT_RED,
  KNOB,
  KNOB_RED,
  LANTERN,
  LANTERN_GLOW,
  LANTERN_GOLD,
  LEGS,
  LEVER,
  LID,
  LID_GRAY,
  LOGO,
  ORANGE,
  PAGE,
  PARCEL,
  PARTY_GOLD,
  PARTY_HAT,
  PARTY_PURPLE,
  ROBIN_BACK,
  ROBIN_BEAK,
  ROBIN_BREAST,
  ROBIN_BROWN,
  ROBIN_FEET,
  ROBIN_RED,
  SAY,
  SCARF_STRIPES,
  SCARF_TAIL,
  SCARF_TAIL_STRIPE,
  SCARF_WRAP,
  SCOPE,
  SCOPE_LENS,
  SCOPE_LENS_BLUE,
  SCREEN,
  SCREEN_DARK,
  SHADE,
  SHADOW,
  SNOWMAN,
  SNOWMAN_ARMS,
  SNOW_SHADE,
  SNOW_WHITE,
  SPRITE_HEIGHT,
  SPRITE_WIDTH,
  STICK,
  STRIPE,
  TERMINAL_GREEN,
  TICK,
  UNIT,
  WAVE,
  balloonOf,
  pathOf,
} from './sprite'
import type { Book, Box, Glyph, Laptop, Rect, Scope, Screen } from './sprite'
import type { Occasion } from './time'
import { FRESH_WORK, MAX_HELPERS } from './work'
import type { Activity, Work } from './work'

export const BAND_HEIGHT = 36

// The character's frame rate.
export const FPS = 12

// The stage's width in CSS pixels: the band's own, held between these two, and the one
// the frames are timed for.
export const MIN_WIDTH = 240
export const MAX_WIDTH = 1200
export const REFERENCE_WIDTH = 480

export type Mood = 'idle' | 'working' | 'joy' | 'puzzled' | 'closing' | 'sleep'
export type Ending = Exclude<Mood, 'idle' | 'working' | 'sleep'>

// The band in words, for a screen reader: what it shows, and in a mood what that means.
export const ALT: Readonly<Record<Mood, string>> = {
  idle: "Claude's pixel character chasing a small orange spark along the band",
  working: "Claude's pixel character typing at a laptop while the spark spins: Claude is working",
  joy: "Claude's pixel character jumping for joy beside the spark: Claude has answered",
  puzzled: "Claude's pixel character puzzled beside the spark: the turn ended without an answer",
  closing: "Claude's pixel character folding its laptop away beside the spark: the turn was stopped",
  sleep: "Claude's pixel character asleep in the snow beside the spark: it is late at night",
}

// The snowy ground along the band's foot: a gray-blue edge over white, so it shows on
// a light page and a dark one. The ice and the footprints are drawn on it.
const GROUND = UNIT
const GROUND_EDGE = '#a9bccf'
const GROUND_SNOW = '#eef4fb'
const ICE_EDGE = '#79b6dc'
const ICE = '#cdeefc'
const GLINT = '#ffffff'
const PRINT = '#7f97b0'
// The z's of a sleeper, in the gray-blue of the snow's shadows.
const SLEEP_BLUE = '#7f97b0'
const TRAIL_LIGHT = '#f2a27f'

// The sprite's top row while it stands on the snow.
export const TOP = BAND_HEIGHT - GROUND - SPRITE_HEIGHT

// How high it may jump: the pom-pom, two grid rows over its head, stays in the band.
export const MAX_HOP = TOP - 2 * UNIT

// The spark: a box 24 pixels square, its rays reaching 10 pixels from the center.
const SPARK_BOX = 24
const SPARK_RADIUS = 10
const SPARK_CENTER_Y = BAND_HEIGHT - GROUND - 1 - SPARK_RADIUS

// From the sprite's left edge to the spark's box while the two stand side by side:
// the spark's rays 6 pixels clear of the character's arm.
const SIDE_BY_SIDE = SPRITE_WIDTH - UNIT + 6 - (SPARK_BOX / 2 - SPARK_RADIUS)

// Paces at the reference width, in pixels a frame.
const RUN_STEP = 2 * UNIT
const WALK_STEP = UNIT
const SLIDE_STEP = 2 * UNIT

// While Claude works the spark whirls a turn in this many seconds: fastest as code
// flies to it, slowest over a book; and it holds still while a question waits.
const WHIRL_SECONDS: Readonly<Record<Activity, number>> = {
  think: 2.4,
  edit: 1.6,
  read: 3.2,
  run: 2,
  web: 2.4,
  wait: 0,
}

// A place along the track: `px` CSS pixels from the band's left edge, plus `of` times
// the stage's width.
export type Place = { px: number; of: number }

export const placeAt = (px: number, of = 0): Place => ({ px, of })

const ZERO = placeAt(0)
const shift = (place: Place, px: number): Place => ({ px: place.px + px, of: place.of })
const less = (one: Place, other: Place): Place => ({ px: one.px - other.px, of: one.of - other.of })
const isSame = (one: Place, other: Place) => Math.abs(one.px - other.px) < 1e-6 && Math.abs(one.of - other.of) < 1e-9

// The way from `from` to `to`, `t` of it gone; all of it lands on `to` itself.
const between = (from: Place, to: Place, t: number): Place =>
  t >= 1 ? to : { px: from.px + (to.px - from.px) * t, of: from.of + (to.of - from.of) * t }

/**
 * Where a place is on a stage `width` CSS pixels wide.
 */
export const pixelsOf = (place: Place, width: number) => place.px + place.of * width

// A place as the two numbers its moves animate: `--of`, its share of the stage's width,
// and `--px`, its pixels. No keyframe holds the width itself, so the browser never
// keeps a position worked out for a width the frame has since left.
function varsOf(place: Place): string {
  return `--of:${Number(place.of.toFixed(5))};--px:${Number(place.px.toFixed(2))}px`
}

// Where the two numbers put a thing, worked out from the frame's width as it is now:
// the character on the sprite's grid of 2 pixels, the spark smoothly.
const ON_GRID = `round(nearest,calc(var(--of) * var(--w) + var(--px)),${UNIT}px)`
const SMOOTH = 'calc(var(--of) * var(--w) + var(--px))'

// A place as CSS, on the sprite's grid of 2 pixels: for what stands still.
function cssOf(place: Place): string {
  if (Math.abs(place.of) < 1e-9) {
    return `${UNIT * Math.round(place.px / UNIT)}px`
  }
  const px = Number(place.px.toFixed(2))
  const tail = px === 0 ? '' : px > 0 ? ` + ${px}px` : ` - ${-px}px`

  return `round(nearest,calc(${Number(place.of.toFixed(5))} * var(--w)${tail}),${UNIT}px)`
}

type Legs = keyof typeof LEGS
type Arms = keyof typeof ARMS
type Eyes = keyof typeof EYES
type Say = keyof typeof SAY | 'none'
type Scarf = keyof typeof SCARF_TAIL
type Breath = keyof typeof BREATH | 'none'
type Pal = keyof typeof SNOWMAN_ARMS

// Something with a place of its own on the band, in CSS pixels, and a pose.
type Placed<Pose extends string> = { x: number; y: number; pose: Pose }

export type Frame = {
  // The sprite's left edge along the track.
  x: Place
  // How far it is off the ground, in CSS pixels.
  hop: number
  // The body sunk a pixel onto tucked legs: before a jump, and as it lands.
  crouch: boolean
  legs: Legs
  arms: Arms
  eyes: Eyes
  say: Say
  laptop: Laptop
  // The other props of the work: a book, a terminal box (its lever up or down) and its
  // screen's lines, binoculars, and code flying off the laptop.
  book: Book
  box: Box
  screen: Screen
  scope: Scope
  glyph: Glyph
  // The scarf's end: hanging still, or streaming behind as the character moves.
  scarf: Scarf
  // A puff of breath in the cold.
  breath: Breath
  // The snowman's right arm.
  pal: Pal
  // The snowflake over the spark, and the robin, where they are when they are there:
  // both near home, so in plain pixels.
  flake: Placed<keyof typeof FLAKE> | null
  robin: Placed<keyof typeof ROBIN_BACK> | null
  // How far the spark tips as it shakes the flake off, in degrees.
  tilt: number
}

// Where the chase starts and ends, and so where every other reel starts or ends: at
// home beside the spark, standing, looking ahead.
export const HOME: Frame = {
  x: placeAt(UNIT),
  hop: 0,
  crouch: false,
  legs: 'stand',
  arms: 'rest',
  eyes: 'ahead',
  say: 'none',
  laptop: 'none',
  book: 'none',
  box: 'none',
  screen: 'none',
  scope: 'none',
  glyph: 'none',
  scarf: 'still',
  breath: 'none',
  pal: 'rest',
  flake: null,
  robin: null,
  tilt: 0,
}

const even = (value: number) => 2 * Math.round(value / 2)

// What stands along the track: the character's home and the spark's beside it, how far
// the spark rolls and where the character stops short of it, the snowman and where the
// character stops to wave to it, the ice, and the place Ramadan's lantern hangs.
export const TRACK = {
  home: HOME.x,
  sparkHome: placeAt(UNIT + SIDE_BY_SIDE),
  far: placeAt(-SPARK_BOX, 1),
  stop: placeAt(-SPARK_BOX - SIDE_BY_SIDE, 1),
  snowman: placeAt(0, 0.33),
  greet: placeAt(12 * UNIT, 0.33),
  iceStart: placeAt(0, 0.58),
  iceEnd: placeAt(0, 0.74),
  lantern: placeAt(0, 0.5),
} as const

/**
 * Whether a sprite at `x` has a foot on the ice, on a stage `width` pixels wide: its
 * feet span columns 4 to 13.
 */
export function isOnIce(x: Place, width: number): boolean {
  const at = pixelsOf(x, width)

  return at + 4 * UNIT < pixelsOf(TRACK.iceEnd, width) && at + 14 * UNIT > pixelsOf(TRACK.iceStart, width)
}

// How many frames a way takes at a pace, at the reference width: never a pixel more a
// frame than the pace there.
const framesFor = (from: Place, to: Place, pace: number) =>
  Math.max(1, Math.ceil(Math.abs(pixelsOf(to, REFERENCE_WIDTH) - pixelsOf(from, REFERENCE_WIDTH)) / pace - 1e-9))

export type Story = {
  frames: Frame[]
  // Where the spark's box rests, and the frames its two rolls start on and last.
  spark: { home: Place; far: Place; out: number; outFrames: number; back: number; backFrames: number }
}

// What the band plays: `intro` once from the moment it is drawn, then `loop` over and
// over. `poster` is the one frame drawn where motion is reduced.
export type Reel = {
  intro: Frame[]
  loop: Frame[]
  poster: Frame
}

type Gait = readonly (readonly [Legs, Arms])[]

// Running is a stride every frame; walking, a stride and a pause.
const RUN: Gait = [
  ['a', 'a'],
  ['b', 'b'],
]
const WALK: Gait = [
  ['a', 'a'],
  ['stand', 'rest'],
  ['b', 'b'],
  ['stand', 'rest'],
]

const seconds = (count: number) => Math.round(count * FPS)

// Frames written a move at a time, each move starting where the last left off.
type Script = {
  frames: Frame[]
  now: () => Frame
  // Makes `change`, then holds the frame `count` times.
  put: (count: number, change?: Partial<Frame>) => void
  blink: () => void
  // Walks or runs to `to` in `count` frames, a stride a frame.
  walk: (to: Place, count: number, gait: Gait) => void
  // Slides to `to` in `count` frames, legs together and arms out.
  slide: (to: Place, count: number) => void
  // A crouch, a frame for each height on the way up and down, and a crouch to land,
  // `dx` pixels along at each height.
  jump: (heights: readonly number[], dx: number, windUp: number) => void
  // Puffs of breath after running, drifting up and away.
  puff: () => void
}

function scriptFrom(start: Frame): Script {
  const frames: Frame[] = []
  let now = start

  const put = (count: number, change: Partial<Frame> = {}) => {
    now = { ...now, ...change }

    for (let index = 0; index < count; index++) {
      frames.push(now)
    }
  }

  const blink = () => {
    const { eyes } = now

    put(2, { eyes: eyes === 'down' ? 'downShut' : 'shut' })
    put(0, { eyes })
  }

  const walk = (to: Place, count: number, gait: Gait) => {
    const from = now.x

    for (let index = 1; index <= count; index++) {
      const [legs, arms]: readonly [Legs, Arms] = gait[(index - 1) % gait.length] ?? ['stand', 'rest']

      put(1, { x: between(from, to, index / count), legs, arms })
    }
    put(0, { legs: 'stand', arms: 'rest' })
  }

  const slide = (to: Place, count: number) => {
    const from = now.x

    for (let index = 1; index <= count; index++) {
      put(1, { x: between(from, to, index / count), legs: 'stand', arms: 'out' })
    }
  }

  const jump = (heights: readonly number[], dx: number, windUp: number) => {
    put(windUp, { crouch: true, legs: 'tuck' })

    for (const hop of heights) {
      put(1, { hop, x: shift(now.x, dx), crouch: false, legs: 'stand', arms: 'up' })
    }
    put(1, { hop: 0, crouch: true, legs: 'tuck', arms: 'rest' })
    put(0, { crouch: false, legs: 'stand' })
  }

  const puff = () => {
    put(2, { breath: 'puff1' })
    put(2, { breath: 'puff2' })
    put(3, { breath: 'puff3' })
    put(0, { breath: 'none' })
  }

  return { frames, now: () => now, put, blink, walk, slide, jump, puff }
}

// How far a frame moves the character, at the reference width.
const paceAt = (frames: readonly Frame[], index: number, isLoop: boolean) => {
  const frame = frames[index]
  const before = index > 0 ? frames[index - 1] : isLoop ? frames[frames.length - 1] : undefined

  return frame === undefined || before === undefined
    ? 0
    : pixelsOf(frame.x, REFERENCE_WIDTH) - pixelsOf(before.x, REFERENCE_WIDTH)
}

// The scarf's end streams behind whatever way the character moves, its tip flapping a
// frame at a time, and hangs still when the character stands.
function dressed(frames: readonly Frame[], isLoop: boolean): Frame[] {
  let flaps = 0

  return frames.map((frame, index) => {
    const dx = paceAt(frames, index, isLoop)

    if (Math.abs(dx) < 1e-9) {
      return { ...frame, scarf: 'still' }
    }
    flaps++

    const isUp = flaps % 2 === 1
    const scarf: Scarf = dx > 0 ? (isUp ? 'blowL1' : 'blowL2') : isUp ? 'blowR1' : 'blowR2'

    return { ...frame, scarf }
  })
}

/**
 * The chase: one loop of the story, along the whole track.
 */
export function storyOf(): Story {
  const script = scriptFrom(HOME)
  const { put, blink, walk, slide, jump, puff } = script
  const { home, sparkHome, far, stop, greet, iceStart, iceEnd } = TRACK

  // At home beside the spark. A snowflake drifts down onto the spark while the
  // character watches it; the spark shakes it off, and the character bounces twice.
  put(seconds(1.5))
  blink()
  put(seconds(0.4))

  const flakeX = sparkHome.px + SPARK_BOX / 2 - UNIT
  // Resting on the topmost ray.
  const landY = SPARK_CENTER_Y - 9 - 3 * UNIT
  const sway = [0, 0, UNIT, UNIT, 0, 0, -UNIT, -UNIT]

  for (let y = -3 * UNIT, step = 0; y < landY; y += UNIT, step++) {
    put(2, {
      flake: { x: flakeX + (sway[step % sway.length] ?? 0), y, pose: 'whole' },
      eyes: y < landY / 2 ? 'up' : 'right',
    })
  }
  put(seconds(0.5), { flake: { x: flakeX, y: landY, pose: 'whole' }, eyes: 'right' })

  const flicks: readonly Frame['flake'][] = [
    { x: flakeX + 2 * UNIT, y: landY - 2 * UNIT, pose: 'whole' },
    { x: flakeX + 4 * UNIT, y: landY - 4 * UNIT, pose: 'bit' },
    { x: flakeX + 6 * UNIT, y: landY - 6 * UNIT, pose: 'bit' },
  ]

  ;[12, -10, 8, -6, 3, 0].forEach((tilt, index) => put(1, { tilt, flake: flicks[index] ?? null }))
  put(seconds(0.4), { eyes: 'ahead' })
  jump([2, 4, 4, 2], 0, 1)
  put(2)
  jump([2, 4, 4, 2], 0, 1)
  put(seconds(1.2))
  blink()
  put(seconds(1))

  // The spark rolls off to the far end, and the character starts: "!".
  const out = script.frames.length

  put(seconds(0.4))
  put(1, { crouch: true, legs: 'tuck', eyes: 'right', say: 'alert' })
  put(seconds(1), { crouch: false, legs: 'stand' })
  put(0, { say: 'none' })

  // It scuttles after it, stops short and puffs in the cold.
  walk(stop, framesFor(home, stop, RUN_STEP), RUN)
  puff()

  // It pounces, and the spark darts back home the moment it crouches.
  const back = script.frames.length

  jump([6, 8, 10, 10, 8, 6], RUN_STEP, 2)

  // Missed: "?", a look after the spark, a blink.
  put(seconds(0.3))
  put(seconds(0.7), { say: 'ask' })
  put(seconds(0.5), { eyes: 'left' })
  blink()
  put(seconds(0.3), { say: 'none' })

  // Home it walks: up to the ice, across it in a slide that skids a little past its
  // edge, then on to the snowman, who waves back when it waves.
  const onto = shift(iceEnd, -4 * UNIT)
  const off = shift(iceStart, -14 * UNIT)
  const skid = shift(off, -2 * UNIT)

  walk(onto, framesFor(script.now().x, onto, WALK_STEP), WALK)
  slide(off, framesFor(onto, off, SLIDE_STEP))
  slide(skid, 2)
  walk(greet, framesFor(skid, greet, WALK_STEP), WALK)
  put(seconds(0.3), { eyes: 'left' })

  for (let wave = 0; wave < 2; wave++) {
    put(3, { arms: 'up', pal: 'rest' })
    put(3, { arms: 'rest', pal: 'wave' })
  }
  put(3, { pal: 'rest' })
  put(seconds(0.2), { eyes: 'ahead' })
  walk(home, framesFor(greet, home, WALK_STEP), WALK)

  // Home again: a heart for the spark, both arms waved, and a last puff of breath.
  put(seconds(0.3), { eyes: 'right' })

  for (let wave = 0; wave < 3; wave++) {
    put(3, { arms: 'up', say: 'love' })
    put(3, { arms: 'rest' })
  }
  put(seconds(0.4))
  put(0, { say: 'none' })
  puff()
  put(seconds(0.6), { eyes: 'ahead' })

  // The spark keeps about one speed at the reference width.
  const distance = pixelsOf(far, REFERENCE_WIDTH) - pixelsOf(sparkHome, REFERENCE_WIDTH)

  return {
    frames: dressed(script.frames, true),
    spark: {
      home: sparkHome,
      far,
      out,
      outFrames: seconds(Math.max(1.6, distance / 100)),
      back,
      backFrames: seconds(Math.max(1.4, distance / 115)),
    },
  }
}

// Where the robin comes from, perches on the hat, and flies off to, in CSS pixels.
const ROBIN_FROM = { x: -8 * UNIT, y: -2 * UNIT }
const ROBIN_PERCH = { x: HOME.x.px + 5 * UNIT, y: TOP - 3 * UNIT }
const ROBIN_AWAY = { x: 45 * UNIT, y: -6 * UNIT }

// The prop for a kind of work, brought out at home.
function setOut({ put }: Script, activity: Activity): void {
  switch (activity) {
    case 'think':
    case 'edit':
      // The laptop comes up out of the snow, and it looks down at it.
      put(1, { laptop: 'closed' })
      put(1, { laptop: 'half' })
      put(1, { laptop: 'open', eyes: 'down' })
      put(2)
      return
    case 'read':
      put(2, { book: 'p1', arms: 'hold', eyes: 'readL' })
      return
    case 'run':
      put(2, { box: 'up', screen: 's1', eyes: 'down' })
      return
    case 'web':
      put(2, { arms: 'up' })
      put(2, { arms: 'scope', scope: 'ahead', eyes: 'none' })
      return
    case 'wait':
      // The laptop set down shut, and a hand up: a question for the person.
      put(1, { laptop: 'closed', eyes: 'ahead' })
      put(2, { arms: 'hand', say: 'ask' })
      return
  }
}

// Thinking and writing at the laptop: typing, the dots of a thought, a glance at the
// spark, and now and then a robin on the hat.
function thinkAt({ put, blink }: Script): void {
  // A key a hand, two frames a key: six keys a second.
  const type = (keys: number) => {
    for (let key = 0; key < keys; key++) {
      put(2, { arms: key % 2 === 0 ? 'tapL' : 'tapR' })
    }
    put(0, { arms: 'rest' })
  }

  // Eyes up while the dots come one at a time.
  const think = (one: number, two: number, three: number) => {
    put(one, { eyes: 'up', say: 'think1' })
    put(two, { say: 'think2' })
    put(three, { say: 'think3' })
    put(0, { eyes: 'down', say: 'none' })
  }

  // The robin in a straight line, a wingbeat a frame.
  const fly = (from: { x: number; y: number }, to: { x: number; y: number }, count: number, eyes: Eyes) => {
    for (let index = 1; index <= count; index++) {
      put(1, {
        robin: {
          x: even(from.x + ((to.x - from.x) * index) / count),
          y: even(from.y + ((to.y - from.y) * index) / count),
          pose: index % 2 === 0 ? 'fly2' : 'fly1',
        },
        eyes,
      })
    }
  }

  type(12)
  put(3)
  think(4, 4, 8)
  put(2)
  blink()
  type(16)
  put(2)
  // A glance at the spark, whirling away beside it.
  put(seconds(0.8), { eyes: 'right' })
  put(3, { eyes: 'down' })
  type(8)
  put(3)
  think(3, 3, 6)
  blink()
  put(4)

  // A robin comes down onto the hat. The character stops to look up at it while it
  // pecks at the wool, and goes back to work once it has flown off.
  type(10)
  put(2)
  fly(ROBIN_FROM, ROBIN_PERCH, 12, 'up')

  for (let peck = 0; peck < 3; peck++) {
    put(5, { robin: { ...ROBIN_PERCH, pose: 'perch' } })
    put(3, { robin: { ...ROBIN_PERCH, pose: 'peck' } })
  }
  put(4, { robin: { ...ROBIN_PERCH, pose: 'perch' } })
  fly(ROBIN_PERCH, ROBIN_AWAY, 12, 'right')
  put(2, { robin: null, eyes: 'down' })
  type(12)
  put(3)
  think(4, 4, 8)
  blink()
  put(4)
}

// "<>" leaving the laptop for the spark once a second, a step up every two frames.
const CODE_FLIGHT: readonly Glyph[] = ['g1', 'g1', 'g2', 'g2', 'g3', 'g3', 'none', 'none', 'none', 'none', 'none', 'none']

// Editing files: typing a key a frame, code flying off to the spark, a look after it.
function editAt({ put, blink }: Script): void {
  const burst = (keys: number) => {
    for (let key = 0; key < keys; key++) {
      put(1, { arms: key % 2 === 0 ? 'tapL' : 'tapR', glyph: CODE_FLIGHT[key % CODE_FLIGHT.length] ?? 'none' })
    }
    put(0, { arms: 'rest', glyph: 'none' })
  }

  burst(36)
  put(2)
  put(seconds(0.6), { eyes: 'right' })
  put(2, { eyes: 'down' })
  burst(24)
  blink()
  burst(36)
  put(3)
}

// Reading files: eyes along a line and back to the next, a page turned now and then,
// a glance at the spark.
function readAt({ put, blink }: Script): void {
  const line = () => {
    put(5, { eyes: 'readL' })
    put(5, { eyes: 'readR' })
  }
  const turn = (to: Book) => {
    put(2, { book: 'turn', eyes: 'down' })
    put(0, { book: to })
  }

  line()
  line()
  line()
  turn('p2')
  line()
  line()
  put(0, { eyes: 'down' })
  blink()
  line()
  put(seconds(0.6), { eyes: 'right' })
  turn('p1')
  line()
  line()
}

// The terminal's lines in turn, one more at each pull of the lever.
const SCREENS: readonly Screen[] = ['s2', 's3', 's1']

// Running a command: the lever pulled down and let up, the screen scrolling at each
// pull, a glance at the spark.
function runAt({ put, blink }: Script): void {
  let lines = 0
  const pull = (times: number) => {
    for (let index = 0; index < times; index++) {
      put(4, { arms: 'pullDown', box: 'down', screen: SCREENS[lines++ % SCREENS.length] ?? 's1' })
      put(4, { arms: 'pullUp', box: 'up' })
    }
    put(0, { arms: 'rest' })
  }

  pull(3)
  put(3)
  put(seconds(0.6), { eyes: 'right' })
  put(2, { eyes: 'down' })
  pull(3)
  blink()
  pull(3)
  put(3)
}

// Searching the web: binoculars turned left, ahead, right and ahead again; lowered once
// for a blink.
function webAt({ put, blink }: Script): void {
  const look = () => {
    put(8, { scope: 'left' })
    put(6, { scope: 'ahead' })
    put(8, { scope: 'right' })
    put(6, { scope: 'ahead' })
  }

  look()
  look()
  put(4, { arms: 'rest', scope: 'none', eyes: 'ahead' })
  blink()
  put(2, { arms: 'up' })
  put(2, { arms: 'scope', scope: 'ahead', eyes: 'none' })
  look()
}

// Waiting on the person: the hand up and waving a little, "?" over its head.
function waitAt({ put, blink }: Script): void {
  for (let wave = 0; wave < 3; wave++) {
    put(6, { arms: 'hand' })
    put(6, { arms: 'hand2' })
  }
  blink()

  for (let wave = 0; wave < 2; wave++) {
    put(6, { arms: 'hand' })
    put(6, { arms: 'hand2' })
  }
}

const WORK_AT: Readonly<Record<Activity, (script: Script) => void>> = {
  think: thinkAt,
  edit: editAt,
  read: readAt,
  run: runAt,
  web: webAt,
  wait: waitAt,
}

/**
 * At work, at home beside the spark, acting out what Claude is busy with: the prop for
 * it comes out, then its loop runs. A turn's first work band opens with "!"; one for a
 * switch of tools opens with a puff, the last work's prop gone in it.
 */
export function workingOf({ activity, opening }: Pick<Work, 'activity' | 'opening'> = FRESH_WORK): Reel {
  const intro = scriptFrom(HOME)

  if (opening === 'start') {
    // "!": there is work.
    intro.put(1, { crouch: true, legs: 'tuck', say: 'alert' })
    intro.put(4, { crouch: false, legs: 'stand' })
    intro.put(0, { say: 'none' })
  } else {
    intro.put(2, { laptop: 'poof' })
    intro.put(0, { laptop: 'none' })
  }
  setOut(intro, activity)

  const loop = scriptFrom(intro.now())

  WORK_AT[activity](loop)

  return { intro: intro.frames, loop: loop.frames, poster: loop.frames[0] ?? HOME }
}

/**
 * Late at night with nothing to do: a yawn at home beside the spark, then sleep in the
 * snow, the z's coming and going and its breath puffing in the cold.
 */
export function sleepingOf(): Reel {
  const intro = scriptFrom(HOME)

  intro.put(seconds(0.5), { eyes: 'up' })
  intro.put(seconds(0.6), { eyes: 'shut' })
  intro.put(2, { eyes: 'ahead' })
  intro.put(seconds(0.5), { eyes: 'shut' })
  intro.put(2, { crouch: true, legs: 'tuck' })

  const loop = scriptFrom(intro.now())
  const { put, puff } = loop
  const snore = () => {
    put(seconds(0.8), { say: 'z1' })
    put(seconds(0.8), { say: 'z2' })
    put(seconds(0.8), { say: 'z3' })
    put(seconds(0.5), { say: 'none' })
  }

  snore()
  puff()
  snore()
  put(seconds(0.6))

  return { intro: intro.frames, loop: loop.frames, poster: loop.frames.find(frame => frame.say === 'z2') ?? HOME }
}

/**
 * How a turn's end is met, from the laptop as the work left it to home, standing,
 * where the chase begins.
 */
export function endingOf(mood: Ending): Frame[] {
  const { frames, put, blink, jump } = scriptFrom({ ...HOME, eyes: 'down', laptop: 'open' })

  // It looks up from the screen. The lid folds shut, and the laptop goes in a puff.
  put(2, { arms: 'rest', eyes: 'ahead' })
  put(1, { laptop: 'half' })
  put(1, { laptop: 'closed' })
  put(2)
  put(2, { laptop: 'poof' })
  put(0, { laptop: 'none' })

  if (mood === 'joy') {
    // A hop for joy, then a tick over its head while it waves both arms.
    put(1, { eyes: 'happy' })
    jump([4, 8, 10, 8, 4], 0, 2)

    for (let wave = 0; wave < 2; wave++) {
      put(3, { arms: 'up', say: 'done' })
      put(3, { arms: 'rest' })
    }
    put(seconds(0.5))
    put(seconds(0.3), { say: 'none', eyes: 'ahead' })
  } else if (mood === 'puzzled') {
    // "?", a look one way and the other, a blink.
    put(seconds(0.3))
    put(seconds(0.4), { say: 'ask' })
    put(seconds(0.4), { eyes: 'left' })
    put(seconds(0.4), { eyes: 'right' })
    blink()
    put(seconds(0.4), { say: 'none', eyes: 'ahead' })
  } else {
    put(seconds(0.5))
  }
  put(seconds(0.2), HOME)

  return frames
}

const msOf = (frames: number) => Math.round((frames / FPS) * 1000)

// How long each ending plays before the chase takes over, in milliseconds.
export const ENDING_MS: Readonly<Record<Ending, number>> = {
  joy: msOf(endingOf('joy').length),
  puzzled: msOf(endingOf('puzzled').length),
  closing: msOf(endingOf('closing').length),
}

// What an ending's still frame says where motion is reduced.
const SIGN: Readonly<Record<Ending, Say>> = { joy: 'done', puzzled: 'ask', closing: 'none' }

/**
 * A mood's reel. An ending plays on into the chase, so the band runs on as it should
 * whenever the switch back to the chase comes.
 */
export function reelOf(mood: Mood, story: Story = storyOf(), work: Work = FRESH_WORK): Reel {
  if (mood === 'working') {
    return workingOf(work)
  }
  if (mood === 'sleep') {
    return sleepingOf()
  }
  const chase = story.frames
  const home = chase[0] ?? HOME

  if (mood === 'idle') {
    return { intro: [], loop: chase, poster: home }
  }
  const intro = endingOf(mood)
  const sign = SIGN[mood]

  return {
    intro,
    loop: chase,
    poster: (sign === 'none' ? undefined : intro.find(frame => frame.say === sign)) ?? home,
  }
}

export type Print = { at: Place; frame: number }

// The footprints of a chase: a print where a foot comes down in front, a stride at a
// time walking and every other stride running, none on the ice, with the frame it is
// made on.
export function printsOf({ frames }: Story): Print[] {
  const prints: Print[] = []
  let strides = 0

  frames.forEach((frame, index) => {
    const dx = paceAt(frames, index, true)

    if (Math.abs(dx) < 1e-9 || frame.hop > 0 || frame.legs !== 'a') {
      return
    }
    strides++

    if (Math.abs(dx) > WALK_STEP + 0.5 && strides % 2 === 0) {
      return
    }
    const at = shift(frame.x, (dx > 0 ? 11 : 4) * UNIT)
    const where = pixelsOf(at, REFERENCE_WIDTH)
    const isOnTheIce =
      where + UNIT > pixelsOf(TRACK.iceStart, REFERENCE_WIDTH) && where < pixelsOf(TRACK.iceEnd, REFERENCE_WIDTH)

    if (!isOnTheIce) {
      prints.push({ at, frame: index })
    }
  })

  return prints
}

// The spark's dash home, as a CSS timing function.
const DART_CURVE = [0.2, 0.7, 0.3, 1] as const

// How far along a cubic-bezier timing function is at the time `t`, both 0 to 1.
function easedAt([x1, y1, x2, y2]: readonly [number, number, number, number], t: number): number {
  const at = (p: number, a: number, b: number) => 3 * (1 - p) * (1 - p) * p * a + 3 * (1 - p) * p * p * b + p * p * p
  let low = 0
  let high = 1

  for (let index = 0; index < 40; index++) {
    const middle = (low + high) / 2

    if (at(middle, x1, x2) < t) {
      low = middle
    } else {
      high = middle
    }
  }

  return at((low + high) / 2, y1, y2)
}

export type Ember = { at: Place; y: number; frame: number; fill: string }

// The sparks the spark sheds darting home: one a frame through the fast part of the
// dash, each a little off its path, centered where the spark is on that frame.
export function trailOf({ spark }: Story): Ember[] {
  const offsets = [
    [0, -3],
    [3, 2],
    [1, 4],
    [4, -2],
    [2, 1],
  ] as const
  const embers: Ember[] = []
  const count = Math.round(spark.backFrames * 0.7)

  for (let index = 1; index <= count; index++) {
    const along = easedAt(DART_CURVE, index / spark.backFrames)
    const [dx, dy] = offsets[index % offsets.length] ?? [0, 0]

    embers.push({
      at: shift(between(spark.far, spark.home, along), SPARK_BOX / 2 + dx),
      y: SPARK_CENTER_Y + dy,
      frame: spark.back + index,
      fill: index % 2 === 0 ? ORANGE : TRAIL_LIGHT,
    })
  }

  return embers
}

const percent = (frame: number, total: number) => `${Number(((frame / total) * 100).toFixed(4))}%`
const secondsOf = (frames: number) => `${Number((frames / FPS).toFixed(3))}s`

// Keyframes that hold each frame's value until it changes: a sprite sheet's timing.
// They end on `end`: a loop's on its own first frame, an intro's on its loop's.
function heldOf(name: string, values: readonly string[], end: string = values[0] ?? ''): string {
  let text = `@keyframes ${name}{`
  let last: string | undefined

  values.forEach((value, frame) => {
    if (value !== last) {
      text += `${percent(frame, values.length)}{${value}}`
      last = value
    }
  })

  return `${text}100%{${end}}}`
}

// Keyframes through each frame's value, eased from one to the next: the spark's way.
function smoothOf(name: string, values: readonly string[]): string {
  let text = `@keyframes ${name}{`

  values.forEach((value, frame) => {
    if (value !== values[frame - 1] || value !== values[frame + 1]) {
      text += `${percent(frame, values.length)}{${value}}`
    }
  })

  return `${text}100%{${values[values.length - 1] ?? ''}}}`
}

// Keyframes for places along the track: held where it stands, and a straight glide at
// a steady pace where it moves, from the frame the pace changes to the next; the
// browser draws the glide between, on any width.
function glidesOf(name: string, places: readonly Place[], end: Place, style: (place: Place) => string): string {
  let text = `@keyframes ${name}{`

  places.forEach((place, frame) => {
    const before = places[frame - 1]
    const pace = less(places[frame + 1] ?? end, place)

    if (before === undefined || !isSame(less(place, before), pace)) {
      const timing = isSame(pace, ZERO) ? 'step-end' : 'linear'

      text += `${percent(frame, places.length)}{${style(place)};animation-timing-function:${timing}}`
    }
  })

  return `${text}100%{${style(end)}}}`
}

// The animations a part runs: its intro's, when the reel has one, then its loop's.
const namesOf = (name: string, reel: Reel) => (reel.intro.length > 0 ? `${name}-in,${name}` : name)

// A part's keyframes over a reel, the intro's ending where the loop begins.
function tracksOf(name: string, reel: Reel, value: (frame: Frame) => string): string {
  const [first] = reel.loop
  const loop = heldOf(name, reel.loop.map(value))

  if (reel.intro.length === 0 || first === undefined) {
    return loop
  }

  return loop + heldOf(`${name}-in`, reel.intro.map(value), value(first))
}

// The character's way along the track over a reel, the intro's ending where the loop
// begins.
function walkerOf(reel: Reel): string {
  const [first] = reel.loop
  const start = first?.x ?? HOME.x
  const style = (place: Place) => varsOf(place)
  const loop = glidesOf(
    'walker',
    reel.loop.map(frame => frame.x),
    start,
    style,
  )

  if (reel.intro.length === 0) {
    return loop
  }

  return (
    loop +
    glidesOf(
      'walker-in',
      reel.intro.map(frame => frame.x),
      start,
      style,
    )
  )
}

type Layer = { css: string; svg: string }

// One part's variants: each a path, shown on the frames that pick it. A variant no
// frame of the reel picks is left out.
function layerOf<K extends string>(
  part: string,
  variants: Readonly<Record<K, readonly Rect[]>>,
  pick: (frame: Frame) => string,
  reel: Reel,
  fill: string,
): Layer {
  const frames = [...reel.intro, ...reel.loop]
  let css = ''
  let svg = ''

  for (const name of Object.keys(variants) as K[]) {
    if (!frames.some(frame => pick(frame) === name)) {
      continue
    }
    const id = `${part}-${name}`
    const isShown = pick(reel.poster) === name

    css += `.${id}{animation-name:${namesOf(id, reel)}}`
    css += tracksOf(id, reel, frame => (pick(frame) === name ? 'opacity:1' : 'opacity:0'))
    svg += `<path class="m ${id}${isShown ? '' : ' hidden'}" fill="${fill}" d="${pathOf(variants[name])}"/>`
  }

  return { css, svg }
}

// Where a placed thing is drawn; off the band while it is not there.
const placeOf = (placed: { x: number; y: number } | null) =>
  placed === null ? 'transform:translate(-40px,-40px)' : `transform:translate(${placed.x}px,${placed.y}px)`

// The spark rolls out smoothly, and darts back fast at first, slowing as it nears home.
const ROLL = 'cubic-bezier(0.45,0,0.55,1)'
const DART = `cubic-bezier(${DART_CURVE.join(',')})`
// Speeding up evenly from rest into the whirl; and out of it, a flick slowing to rest.
const SPIN_UP = 'cubic-bezier(0.333,0,0.667,0.333)'
const SPIN_DOWN = 'cubic-bezier(0.2,0.6,0.35,1)'

// The chase's two rolls of the spark, out and back. It turns as a wheel of its size
// would over the way at the reference width.
function rollCssOf({ frames, spark }: Story): string {
  const total = frames.length
  const distance = pixelsOf(spark.far, REFERENCE_WIDTH) - pixelsOf(spark.home, REFERENCE_WIDTH)
  const turn = Math.round((distance / (2 * Math.PI * SPARK_RADIUS)) * 360)
  const rollOf = (name: string, at: (isFar: boolean) => string) => {
    return (
      `@keyframes ${name}{0%{${at(false)}}` +
      `${percent(spark.out, total)}{${at(false)};animation-timing-function:${ROLL}}` +
      `${percent(spark.out + spark.outFrames, total)}{${at(true)}}` +
      `${percent(spark.back, total)}{${at(true)};animation-timing-function:${DART}}` +
      `${percent(spark.back + spark.backFrames, total)}{${at(false)}}100%{${at(false)}}}`
    )
  }

  return (
    rollOf('spark-x', isFar => varsOf(isFar ? spark.far : spark.home)) +
    rollOf('spark-spin', isFar => `transform:rotate(${isFar ? turn : 0}deg)`)
  )
}

// The spark in each mood. In the chase it rolls, and wobbles under the snowflake. At
// work it stays home, winds up into a whirl and glows. At a turn's end its glow fades
// and it spins down to rest, hopping with the character for joy, and the chase's
// moves wait for the intro to end. Asleep, it rests at home. Waiting on the person, it
// holds still and glows; as the work switches tools, it whirls on at once.
function sparkCssOf(mood: Mood, reel: Reel, story: Story, work: Work): string {
  const home = `.spark-x{${varsOf(story.spark.home)};transform:translateX(${SMOOTH})`
  const loop = secondsOf(story.frames.length)
  const intro = secondsOf(reel.intro.length)
  const tilt = smoothOf(
    'spark-tilt',
    story.frames.map(frame => `transform:rotate(${frame.tilt}deg)`),
  )

  if (mood === 'idle') {
    return [
      `${home};animation:spark-x ${loop} linear infinite}`,
      `.spark-spin{animation:spark-spin ${loop} linear infinite}`,
      `.spark-tilt{animation:spark-tilt ${loop} linear infinite}`,
      rollCssOf(story),
      tilt,
    ].join('\n')
  }

  if (mood === 'sleep') {
    return `${home}}`
  }

  if (mood === 'working') {
    const whirl = WHIRL_SECONDS[work.activity]
    const pulse = '@keyframes glow{0%,100%{opacity:0.5;transform:scale(0.9)}50%{opacity:0.85;transform:scale(1.05)}}'
    const spin = '@keyframes spark-whirl{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}'

    if (whirl === 0) {
      return [`${home}}`, '.glow{opacity:0.5;animation:glow 2.6s ease-in-out infinite}', pulse].join('\n')
    }
    if (work.opening === 'switch') {
      return [
        `${home}}`,
        `.spark-spin{animation:spark-whirl ${whirl}s linear infinite}`,
        spin,
        '.glow{opacity:0.5;animation:glow 1.8s ease-in-out infinite}',
        pulse,
      ].join('\n')
    }
    // Speeding up evenly over the intro, it turns half as far as the whirl would.
    const windUp = ((360 / whirl) * (reel.intro.length / FPS)) / 2

    return [
      `${home}}`,
      `.spark-wind{animation:spark-wind ${intro} ${SPIN_UP} forwards}`,
      `@keyframes spark-wind{from{transform:rotate(0deg)}to{transform:rotate(${windUp.toFixed(2)}deg)}}`,
      `.spark-spin{animation:spark-whirl ${whirl}s linear ${intro} infinite}`,
      spin,
      `.glow{opacity:0.5;animation:glow-in ${intro} ease-out forwards,glow 1.8s ease-in-out ${intro} infinite}`,
      '@keyframes glow-in{from{opacity:0;transform:scale(0.6)}to{opacity:0.5;transform:scale(0.9)}}',
      pulse,
    ].join('\n')
  }

  // A whole turn, so it comes to rest where the chase's spark starts out.
  const settle = secondsOf(Math.min(reel.intro.length, seconds(mood === 'joy' ? 1 : 1.5)))
  const css = [
    `${home};animation:spark-x ${loop} linear ${intro} infinite}`,
    `.spark-spin{animation:spark-settle ${settle} ${SPIN_DOWN},spark-spin ${loop} linear ${intro} infinite}`,
    '@keyframes spark-settle{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
    `.spark-tilt{animation:spark-tilt ${loop} linear ${intro} infinite}`,
    rollCssOf(story),
    tilt,
    '.glow{opacity:0;animation:glow-out 0.6s ease-in}',
    '@keyframes glow-out{from{opacity:0.5;transform:scale(0.9)}to{opacity:0;transform:scale(0.6)}}',
  ]

  if (mood === 'joy') {
    css.push(
      `.spark-hop{animation:spark-hop ${intro} linear}`,
      smoothOf(
        'spark-hop',
        reel.intro.map(frame => `transform:translateY(${-Math.round(frame.hop * 0.6)}px)`),
      ),
    )
  }

  return css.join('\n')
}

// Each ray's angle in degrees and its length: uneven, as a spark drawn by hand is.
const RAYS: readonly (readonly [number, number])[] = [
  [0, 9],
  [33, 7.2],
  [64, 8.6],
  [98, 7],
  [130, 8.8],
  [163, 7.4],
  [196, 9],
  [229, 7.2],
  [262, 8.4],
  [295, 7],
  [328, 8.6],
]

function raysOf(): string {
  return RAYS.map(([angle, length], index) => {
    // Neighbors breathe out of step, so the spark shimmers instead of pulsing whole.
    const delay = ((index * 7) % RAYS.length) * 0.22

    return `<g transform="rotate(${angle})"><line class="ray" x1="0" y1="0" x2="${length}" y2="0" style="animation-delay:-${delay.toFixed(2)}s"/></g>`
  }).join('')
}

// New Year's confetti: pieces falling the height of the band in pixel steps, each on a
// loop of its own and drifting a little to one side. Held still, they are out of sight
// over the band.
function confettiOf(): Layer {
  let svg = ''

  for (let index = 0; index < 24; index++) {
    const x = ((index * 37) % 97) + 1.5
    const loop = 3 + ((index * 7) % 5) * 0.4
    const delay = (((index * 13) % 10) / 10) * loop
    const drift = ((index % 3) - 1) * 2 * UNIT

    svg +=
      `<rect class="confetti" x="${x}%" y="${-UNIT}" width="${UNIT}" height="${UNIT}" fill="${CONFETTI[index % CONFETTI.length]}" ` +
      `style="--drift:${drift}px;animation-duration:${loop.toFixed(1)}s;animation-delay:-${delay.toFixed(1)}s"/>`
  }

  return {
    svg,
    css:
      '.confetti{shape-rendering:crispEdges;animation-name:confetti;animation-timing-function:steps(19,end);animation-iteration-count:infinite}' +
      `@keyframes confetti{from{transform:translate(0,0)}to{transform:translate(var(--drift),${BAND_HEIGHT + UNIT}px)}}`,
  }
}

// Ramadan's lantern, hanging from the top of the band halfway along, clear of the
// character's head; its glass and glow flicker as a flame would.
function lanternOf(): Layer {
  return {
    svg:
      '<g class="px lantern">' +
      `<circle class="lantern-lit" cx="${2.5 * UNIT}" cy="${4 * UNIT}" r="${4 * UNIT}" fill="${LANTERN_GLOW}" fill-opacity="0.3"/>` +
      `<path fill="${LANTERN_GOLD}" d="${pathOf(LANTERN.frame)}"/>` +
      `<path class="lantern-lit" fill="${LANTERN_GLOW}" d="${pathOf(LANTERN.glass)}"/></g>`,
    css:
      `.lantern{transform:translateX(${cssOf(TRACK.lantern)})}` +
      '.lantern-lit{animation:flicker 1.7s step-end infinite}' +
      '@keyframes flicker{0%{opacity:1}23%{opacity:0.78}31%{opacity:1}64%{opacity:0.88}71%{opacity:1}}',
  }
}

// How far a helper paces, and how far apart two helpers work. They work at the far end
// of the stage, a row from the right edge in: the snowman, a third of the way along,
// never stands in their way, however narrow the band.
const HELPER_WALK = 12 * UNIT
const HELPER_GAP = 20 * UNIT

// The stretch a helper's pacing covers: its own width and its walk.
export const HELPER_SPAN = 8 * UNIT + HELPER_WALK

/** Where helper `index` paces from: a row in from the stage's right end. */
export function helperAt(index: number): Place {
  return placeAt(-(HELPER_SPAN + 4 * UNIT + index * HELPER_GAP), 1)
}

// The helpers: one for each agent Claude has out, each carrying a parcel back and forth
// in pixel steps, out of step with the others, its legs scuttling.
function helpersOf(count: number): Layer {
  let svg = ''

  for (let index = 0; index < Math.min(count, MAX_HELPERS); index++) {
    const hat = HELPER_HATS[index % HELPER_HATS.length] ?? KNIT_RED

    svg +=
      `<g class="px" style="transform:translate(${cssOf(helperAt(index))},${BAND_HEIGHT - GROUND - 5 * UNIT}px)">` +
      `<g class="helper" style="animation-delay:-${(index * 0.8).toFixed(1)}s">` +
      `<path fill="${PARCEL}" d="${pathOf(HELPER.parcel)}"/>` +
      `<path fill="${ORANGE}" d="${pathOf(HELPER.body)}"/>` +
      `<path fill="${hat}" d="${pathOf(HELPER.hat)}"/>` +
      `<path fill="${EYE}" d="${pathOf(HELPER.eyes)}"/>` +
      `<path class="helper-a" fill="${ORANGE}" d="${pathOf(HELPER_LEGS.a)}"/>` +
      `<path class="helper-b" fill="${ORANGE}" d="${pathOf(HELPER_LEGS.b)}"/>` +
      '</g></g>'
  }

  return {
    svg,
    css:
      '.helper{animation:helper-go 2.4s steps(12,end) infinite}' +
      `@keyframes helper-go{0%,100%{transform:translateX(0)}50%{transform:translateX(${HELPER_WALK}px)}}` +
      '.helper-a,.helper-b{animation:helper-step 0.34s step-end infinite}.helper-b{animation-delay:-0.17s}' +
      '@keyframes helper-step{0%{opacity:1}50%{opacity:0}}',
  }
}

// The style as text in the markup, escaped: it then reads the same parsed as XML, as
// HTML, or through the desktop's scrub, which takes a bare "<length>" in an @property
// rule for a tag, drops it, and the rule with it.
function textOf(css: string): string {
  return css.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Everything that moves: what reduced motion holds still, and /winter calm too.
const MOVING =
  '.m,.ray,.spark-x,.spark-hop,.spark-tilt,.spark-wind,.spark-spin,.glow,.print,.ember,.glint,.confetti,.lantern-lit,.helper,.helper-a,.helper-b'

const STILL = `:is(${MOVING}){animation:none!important}`

// The pointer over the band stops it, where a pointer can hover: the character turns to
// look at whoever it is and waves. A press on the band makes it jump with a heart over
// its head, and the heart and its happy eyes stay a moment after the press.
const INTERACTIVE = [
  '.gaze,.wave-a,.wave-b,.poke-heart,.poke-face{opacity:0}',
  '@media (hover: hover){' +
    `svg:hover :is(${MOVING}){animation-play-state:paused}` +
    'svg:hover .m:is([class*="eyes-"],[class*="arms-"],[class*="say-"]){opacity:0!important}' +
    'svg:hover .gaze{opacity:1}' +
    'svg:hover .wave-a{animation:wave-a 0.6s step-end infinite}' +
    'svg:hover .wave-b{animation:wave-b 0.6s step-end infinite}}',
  '@keyframes wave-a{0%{opacity:1}50%{opacity:0}}',
  '@keyframes wave-b{0%{opacity:0}50%{opacity:1}}',
  '.poke{transition:transform 0.25s steps(3,end) 0.45s}',
  // Up from the press's first moment, so even the quickest click shows the jump.
  'svg:active .poke{transform:translateY(-8px);transition:transform 0.08s steps(2,start)}',
  '.poke-heart,.poke-face{transition:opacity 0s 1.2s}',
  'svg:active :is(.poke-heart,.poke-face){opacity:1;transition:none}',
  '@media (hover: hover) and (prefers-reduced-motion: reduce){svg:hover .wave-a{animation:none;opacity:1}}',
  '@media (prefers-reduced-motion: reduce){.poke,svg:active .poke{transform:none;transition:none}}',
].join('\n')

// How long a footprint takes to melt, how dark it is when new, and how long a shed
// spark takes to fade, in frames.
const MELT = seconds(5)
const PRINT_DEPTH = 0.7
const EMBER_FADE = 5

/**
 * The band's drawing in a mood, as wide as its frame. `calm`, as the person asks with
 * /winter calm, holds it still on its still frame, with no answer to the pointer.
 * `occasion` dresses it: a party hat and confetti for New Year, a lantern for Ramadan.
 * `work`, while Claude works: what it is busy with, how the band opens, and how many
 * helpers it has out.
 */
export function bandOf(
  mood: Mood = 'idle',
  { calm = false, occasion = 'none', work = FRESH_WORK }: { calm?: boolean; occasion?: Occasion; work?: Work } = {},
): string {
  const story = storyOf()
  const reel = reelOf(mood, story, work)
  const { intro, loop, poster } = reel
  const frames = [...intro, ...loop]
  // The spark glows at work and fades out of it, and has no glow in the chase or asleep.
  const isLit = mood !== 'idle' && mood !== 'sleep'
  // The footprints and the shed sparks follow the chase, which work and sleep have none of.
  const isChase = mood !== 'working' && mood !== 'sleep'
  const chaseFrames = story.frames.length
  const chaseLoop = secondsOf(chaseFrames)
  const introSeconds = intro.length / FPS

  // With an intro, each part runs two animations: the intro once, holding its last
  // frame, then the loop for good from the moment the intro ends.
  const timing =
    intro.length > 0
      ? `.m{animation-duration:${secondsOf(intro.length)},${secondsOf(loop.length)};` +
        `animation-delay:0s,${secondsOf(intro.length)};animation-iteration-count:1,infinite;` +
        'animation-fill-mode:forwards,none;animation-timing-function:step-end}'
      : `.m{animation-duration:${secondsOf(loop.length)};animation-timing-function:step-end;animation-iteration-count:infinite}`

  const shadows = layerOf(
    'shadow',
    SHADOW,
    frame => (frame.hop === 0 ? 'wide' : frame.hop <= 6 ? 'mid' : 'small'),
    reel,
    SHADE,
  )
  const legs = layerOf('legs', LEGS, frame => frame.legs, reel, ORANGE)
  const arms = layerOf('arms', ARMS, frame => frame.arms, reel, ORANGE)
  const eyes = layerOf('eyes', EYES, frame => frame.eyes, reel, EYE)
  const tail = layerOf('tail', SCARF_TAIL, frame => frame.scarf, reel, KNIT_RED)
  const tailStripe = layerOf('stripe', SCARF_TAIL_STRIPE, frame => frame.scarf, reel, STRIPE)
  const breath = layerOf('breath', BREATH, frame => frame.breath, reel, BREATH_GRAY)
  const words = layerOf(
    'say',
    {
      alert: balloonOf(SAY.alert),
      ask: balloonOf(SAY.ask),
      think1: balloonOf(SAY.think1),
      think2: balloonOf(SAY.think2),
      think3: balloonOf(SAY.think3),
    },
    frame => frame.say,
    reel,
    ORANGE,
  )
  const love = layerOf('say', { love: balloonOf(SAY.love) }, frame => frame.say, reel, HEART)
  const snores = layerOf(
    'say',
    { z1: balloonOf(SAY.z1), z2: balloonOf(SAY.z2), z3: balloonOf(SAY.z3) },
    frame => frame.say,
    reel,
    SLEEP_BLUE,
  )
  const tick = layerOf('say', { done: balloonOf(SAY.done) }, frame => frame.say, reel, TICK)
  const lid = layerOf('lid', LID, frame => frame.laptop, reel, LID_GRAY)
  const hinge = layerOf(
    'hinge',
    HINGE,
    frame => (frame.laptop === 'none' || frame.laptop === 'poof' ? 'none' : 'down'),
    reel,
    HINGE_GRAY,
  )
  const logo = layerOf('logo', LOGO, frame => frame.laptop, reel, ORANGE)
  const hasBook = (frame: Frame) => (frame.book === 'none' ? 'none' : 'on')
  const hasBox = (frame: Frame) => (frame.box === 'none' ? 'none' : 'on')
  const props = [
    layerOf('book', { on: BOOK.cover }, hasBook, reel, BOOK_BLUE),
    layerOf('pages', { on: BOOK.pages }, hasBook, reel, PAGE),
    layerOf('lines', BOOK_LINES, frame => frame.book, reel, INK),
    layerOf('turn', BOOK_TURN, frame => frame.book, reel, PAGE),
    layerOf('box', { on: BOX.body }, hasBox, reel, BOX_DARK),
    layerOf('glass', { on: BOX.screen }, hasBox, reel, SCREEN_DARK),
    layerOf('screen', SCREEN, frame => frame.screen, reel, TERMINAL_GREEN),
    layerOf('lever', LEVER, frame => frame.box, reel, LID_GRAY),
    layerOf('knob', KNOB, frame => frame.box, reel, KNOB_RED),
    layerOf('glyph', GLYPHS, frame => frame.glyph, reel, CODE_BLUE),
  ]
  const scope = [
    layerOf('scope', SCOPE, frame => frame.scope, reel, BOX_DARK),
    layerOf('lens', SCOPE_LENS, frame => frame.scope, reel, SCOPE_LENS_BLUE),
  ]
  const helpers = mood === 'working' ? helpersOf(work.helpers) : { svg: '', css: '' }
  const pal = layerOf('pal', SNOWMAN_ARMS, frame => frame.pal, reel, STICK)
  const flake = layerOf('flake', FLAKE, frame => frame.flake?.pose ?? 'none', reel, FLAKE_BLUE)
  const robinPose = (frame: Frame) => frame.robin?.pose ?? 'none'
  const robin = [
    layerOf('robin-back', ROBIN_BACK, robinPose, reel, ROBIN_BROWN),
    layerOf('robin-breast', ROBIN_BREAST, robinPose, reel, ROBIN_RED),
    layerOf('robin-beak', ROBIN_BEAK, robinPose, reel, BEAK),
    layerOf('robin-feet', ROBIN_FEET, robinPose, reel, EYE),
  ]
  const hasFlake = frames.some(frame => frame.flake !== null)
  const hasRobin = frames.some(frame => frame.robin !== null)
  const foot = BAND_HEIGHT - GROUND

  // The footprints in the snow, and the sparks shed on the dash home. Each runs one
  // shared fade on the chase's clock, from the moment it is made: its delay is the
  // frame it is made on, a loop back, past any intro.
  const delayOf = (frame: number) => `${Number((introSeconds + (frame - chaseFrames) / FPS).toFixed(3))}s`
  let marks = ''
  let embers = ''

  if (isChase) {
    for (const print of printsOf(story)) {
      marks +=
        `<rect class="print" y="${foot}" width="${UNIT}" height="${GROUND}" fill="${PRINT}" ` +
        `style="transform:translateX(${cssOf(print.at)});animation-delay:${delayOf(print.frame)}"/>`
    }
    for (const ember of trailOf(story)) {
      embers +=
        `<rect class="ember" y="${ember.y - 1}" width="${UNIT}" height="${UNIT}" fill="${ember.fill}" ` +
        `style="transform:translateX(${cssOf(shift(ember.at, -1))});animation-delay:${delayOf(ember.frame)}"/>`
    }
  }

  // What the occasion brings: confetti for New Year, a lantern for Ramadan.
  const confetti = occasion === 'newyear' ? confettiOf() : { svg: '', css: '' }
  const lantern = occasion === 'ramadan' ? lanternOf() : { svg: '', css: '' }

  const css = [
    // The stage: the frame's own width, between the two bounds, read by every place
    // along the track; the drawing as wide as the stage and as tall as the band.
    `@property --w{syntax:'<length>';inherits:true;initial-value:${REFERENCE_WIDTH}px}`,
    "@property --of{syntax:'<number>';inherits:false;initial-value:0}",
    "@property --px{syntax:'<length>';inherits:false;initial-value:0px}",
    `svg{--w:max(${MIN_WIDTH}px,min(100vw,${MAX_WIDTH}px));width:var(--w);height:${BAND_HEIGHT}px;display:block;overflow:hidden}`,
    timing,
    '.hidden{opacity:0}',
    '.px,.print,.ember{shape-rendering:crispEdges}',
    `.walker{${varsOf(poster.x)};transform:translate(${ON_GRID},${TOP}px);animation-name:${namesOf('walker', reel)}}`,
    `.jumper{transform:translateY(${-poster.hop}px);animation-name:${namesOf('jumper', reel)}}`,
    `.body{transform:translateY(${poster.crouch ? UNIT : 0}px);animation-name:${namesOf('body', reel)}}`,
    walkerOf(reel),
    tracksOf('jumper', reel, frame => `transform:translateY(${-frame.hop}px)`),
    tracksOf('body', reel, frame => `transform:translateY(${frame.crouch ? UNIT : 0}px)`),
    hasFlake
      ? `.flake-at{${placeOf(poster.flake)};animation-name:${namesOf('flake-at', reel)}}` +
        tracksOf('flake-at', reel, frame => placeOf(frame.flake))
      : '',
    hasRobin
      ? `.robin-at{${placeOf(poster.robin)};animation-name:${namesOf('robin-at', reel)}}` +
        tracksOf('robin-at', reel, frame => placeOf(frame.robin))
      : '',
    `.snowman{transform:translate(${cssOf(TRACK.snowman)},${TOP}px)}`,
    `.glint-at{transform:translateX(${cssOf(shift(TRACK.iceStart, 4 * UNIT))})}`,
    shadows.css,
    legs.css,
    arms.css,
    eyes.css,
    tail.css,
    tailStripe.css,
    breath.css,
    words.css,
    love.css,
    snores.css,
    tick.css,
    lid.css,
    hinge.css,
    logo.css,
    pal.css,
    flake.css,
    ...robin.map(layer => layer.css),
    ...props.map(layer => layer.css),
    ...scope.map(layer => layer.css),
    helpers.css,
    sparkCssOf(mood, reel, story, work),
    // Every footprint and shed spark shares one fade on the chase's clock.
    `.print{opacity:0;animation:melt ${chaseLoop} linear infinite}`,
    `@keyframes melt{0%{opacity:${PRINT_DEPTH}}${percent(MELT, chaseFrames)}{opacity:0}100%{opacity:0}}`,
    `.ember{opacity:0;animation:ember ${chaseLoop} linear infinite}`,
    `@keyframes ember{0%{opacity:1}${percent(EMBER_FADE, chaseFrames)}{opacity:0}100%{opacity:0}}`,
    confetti.css,
    lantern.css,
    // Now and then the light catches the ice.
    '.glint{opacity:0;animation:glint 5s step-end infinite}',
    '@keyframes glint{0%{opacity:0}86%{opacity:0.9}92%{opacity:0}}',
    `.ray{stroke:${ORANGE};stroke-width:2.1;stroke-linecap:round;animation:breathe ${mood === 'working' ? 1.3 : mood === 'sleep' ? 4 : 2.6}s ease-in-out infinite}`,
    '@keyframes breathe{0%,100%{transform:scaleX(1)}50%{transform:scaleX(0.7)}}',
    `@media (prefers-reduced-motion: reduce){${MOVING}{animation:none}}`,
    calm ? STILL : INTERACTIVE,
  ].join('\n')

  // What answers the pointer: eyes that look out, a waving arm, and for a press a happy
  // face and a heart.
  const answer = calm
    ? { body: '', over: '' }
    : {
        body:
          `<path class="gaze" fill="${EYE}" d="${pathOf(EYES.ahead)}"/>` +
          `<path class="wave-a" fill="${ORANGE}" d="${pathOf(WAVE.a)}"/>` +
          `<path class="wave-b" fill="${ORANGE}" d="${pathOf(WAVE.b)}"/>` +
          `<g class="poke-face"><path fill="${ORANGE}" d="${pathOf(FACE)}"/><path fill="${EYE}" d="${pathOf(EYES.happy)}"/></g>`,
        over: `<path class="poke-heart" fill="${HEART}" d="${pathOf(balloonOf(SAY.love))}"/>`,
      }

  // The glow: soft orange, fading out from the spark's heart.
  const defs = isLit
    ? `<defs><radialGradient id="glow"><stop offset="0" stop-color="${ORANGE}" stop-opacity="0.65"/><stop offset="1" stop-color="${ORANGE}" stop-opacity="0"/></radialGradient></defs>`
    : ''
  const glow = isLit ? `<circle class="glow" r="${SPARK_RADIUS + 3}" fill="url(#glow)"/>` : ''
  const iceStart = `${Number((TRACK.iceStart.of * 100).toFixed(3))}%`
  const iceWidth = `${Number(((TRACK.iceEnd.of - TRACK.iceStart.of) * 100).toFixed(3))}%`
  const ground =
    `<rect class="px" x="0" y="${foot}" width="100%" height="${GROUND / 2}" fill="${GROUND_EDGE}"/>` +
    `<rect class="px" x="0" y="${foot + GROUND / 2}" width="100%" height="${GROUND / 2}" fill="${GROUND_SNOW}"/>` +
    `<rect class="px" x="${iceStart}" y="${foot}" width="${iceWidth}" height="${GROUND / 2}" fill="${ICE_EDGE}"/>` +
    `<rect class="px" x="${iceStart}" y="${foot + GROUND / 2}" width="${iceWidth}" height="${GROUND / 2}" fill="${ICE}"/>` +
    `<g class="glint-at"><rect class="glint px" y="${foot}" width="${2 * UNIT}" height="${GROUND / 2}" fill="${GLINT}"/></g>`
  const snowman =
    '<g class="px snowman">' +
    `<path fill="${SNOW_WHITE}" d="${pathOf(SNOWMAN.snow)}"/>` +
    `<path fill="${SNOW_SHADE}" d="${pathOf(SNOWMAN.shade)}"/>` +
    `<path fill="${COAL}" d="${pathOf(SNOWMAN.coal)}"/>` +
    `<path fill="${CARROT}" d="${pathOf(SNOWMAN.carrot)}"/>` +
    `${pal.svg}</g>`
  const hat =
    occasion === 'newyear'
      ? `<path fill="${PARTY_PURPLE}" d="${pathOf(PARTY_HAT.cone)}"/><path fill="${PARTY_GOLD}" d="${pathOf(PARTY_HAT.stripes)}"/>`
      : `<path fill="${KNIT_RED}" d="${pathOf(HAT.crown)}"/><path fill="${KNIT_PINK}" d="${pathOf([...HAT.cuff, ...HAT.pom])}"/>`
  const clothes =
    hat + `<path fill="${KNIT_RED}" d="${pathOf(SCARF_WRAP)}"/>` + `<path fill="${STRIPE}" d="${pathOf(SCARF_STRIPES)}"/>`

  // The width it says it has is the widest the stage can be, so the app gives the band
  // the whole of its slot up to that; the CSS above then fits the stage to the frame.
  // Back to front: the snow and its footprints, the snowman and the lantern, the shadow,
  // the shed sparks under the spark, the snowflake on it and the confetti, the character
  // and its laptop, and the robin on its hat.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${MAX_WIDTH}" height="${BAND_HEIGHT}">
<style>
${textOf(css)}
</style>${defs}
${ground}${marks}
${snowman}${lantern.svg}
<g class="m walker px" fill-opacity="0.22">${shadows.svg}</g>
${embers}
<g class="spark-x"><g class="spark-hop"><g transform="translate(${SPARK_BOX / 2} ${SPARK_CENTER_Y})">${glow}<g class="spark-tilt"><g class="spark-wind"><g class="spark-spin">${raysOf()}</g></g></g></g></g></g>
${hasFlake ? `<g class="m flake-at px">${flake.svg}</g>` : ''}${confetti.svg}${helpers.svg}
<g class="m walker px"><g class="poke"><g class="m jumper">${legs.svg}<g class="m body"><path fill="${ORANGE}" d="${pathOf(BODY)}"/>${clothes}${tail.svg}${tailStripe.svg}${arms.svg}${eyes.svg}${scope.map(layer => layer.svg).join('')}${answer.body}</g>${breath.svg}${words.svg}${love.svg}${snores.svg}${tick.svg}${answer.over}</g></g>${lid.svg}${hinge.svg}${logo.svg}${props.map(layer => layer.svg).join('')}</g>
${hasRobin ? `<g class="m robin-at px">${robin.map(layer => layer.svg).join('')}</g>` : ''}
</svg>`
}
