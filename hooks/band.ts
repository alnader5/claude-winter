// The row above the prompt: Claude's pixel character and the small orange spark share
// one snowy track. The spark moves smoothly. The character moves the way an old game's
// sprite does: a whole frame at a time, twelve frames a second, on a grid of pixels.
// It wears a knitted hat and a striped scarf, whose end streams behind it as it moves.
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

import {
  ARMS,
  BEAK,
  BODY,
  BREATH,
  BREATH_GRAY,
  CARROT,
  COAL,
  CONFETTI,
  EYE,
  EYES,
  FACE,
  FLAKE,
  FLAKE_BLUE,
  HAT,
  HEART,
  HINGE,
  HINGE_GRAY,
  KNIT_PINK,
  KNIT_RED,
  LANTERN,
  LANTERN_GLOW,
  LANTERN_GOLD,
  LEGS,
  LID,
  LID_GRAY,
  LOGO,
  ORANGE,
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
  TICK,
  UNIT,
  WAVE,
  balloonOf,
  pathOf,
} from './sprite'
import type { Laptop, Rect } from './sprite'
import type { Occasion } from './time'

export const BAND_HEIGHT = 36

// The character's frame rate.
export const FPS = 12

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

const RUN_STEP = 2 * UNIT
const WALK_STEP = UNIT

// While Claude works the spark whirls a turn in this many seconds.
const WHIRL_SECONDS = 2.4

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
  // The sprite's left edge along the track, in CSS pixels.
  x: number
  // How far it is off the ground, in CSS pixels.
  hop: number
  // The body sunk a pixel onto tucked legs: before a jump, and as it lands.
  crouch: boolean
  legs: Legs
  arms: Arms
  eyes: Eyes
  say: Say
  laptop: Laptop
  // The scarf's end: hanging still, or streaming behind as the character moves.
  scarf: Scarf
  // A puff of breath in the cold.
  breath: Breath
  // The snowman's right arm.
  pal: Pal
  // The snowflake over the spark, and the robin, where they are when they are there.
  flake: Placed<keyof typeof FLAKE> | null
  robin: Placed<keyof typeof ROBIN_BACK> | null
  // How far the spark tips as it shakes the flake off, in degrees.
  tilt: number
}

// Where the chase starts and ends, and so where every other reel starts or ends: at
// home beside the spark, standing, looking ahead.
export const HOME: Frame = {
  x: UNIT,
  hop: 0,
  crouch: false,
  legs: 'stand',
  arms: 'rest',
  eyes: 'ahead',
  say: 'none',
  laptop: 'none',
  scarf: 'still',
  breath: 'none',
  pal: 'rest',
  flake: null,
  robin: null,
  tilt: 0,
}

const even = (value: number) => 2 * Math.round(value / 2)

// What stands along a track `width` CSS pixels wide.
export type Track = {
  width: number
  // The character's home, where the spark's box rests beside it, how far the spark
  // rolls, and where the character stops short of it.
  home: number
  sparkHome: number
  far: number
  stop: number
  // The snowman's left edge, and where the character stops to wave to it.
  snowman: number
  greet: number
  // The ice, between these two.
  iceStart: number
  iceEnd: number
}

export function trackOf(width: number): Track {
  const home = HOME.x
  const sparkHome = home + SIDE_BY_SIDE
  const far = width - SPARK_BOX
  // A whole number of running steps, stopping short of the spark.
  const stop = home + Math.floor((far - SIDE_BY_SIDE - home) / RUN_STEP) * RUN_STEP
  const snowman = even(width * 0.33)

  return {
    width,
    home,
    sparkHome,
    far,
    stop,
    snowman,
    greet: snowman + 12 * UNIT,
    iceStart: even(width * 0.58),
    iceEnd: even(width * 0.74),
  }
}

// Whether a sprite at `x` has a foot on the ice: its feet span columns 4 to 13.
export function isOnIce(track: Track, x: number): boolean {
  return x + 4 * UNIT < track.iceEnd && x + 14 * UNIT > track.iceStart
}

export type Story = {
  frames: Frame[]
  // Where the spark's box rests, and the frames its two rolls start on and last.
  spark: { home: number; far: number; out: number; outFrames: number; back: number; backFrames: number }
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
  // Walks or runs to `to`. Walking onto ice it slides instead, legs together and arms
  // out, twice as fast, and skids a little way past the edge.
  walk: (to: number, step: number, gait: Gait) => void
  // A crouch, a frame for each height on the way up and down, and a crouch to land.
  jump: (heights: readonly number[], dx: number, windUp: number) => void
  // Puffs of breath after running, drifting up and away.
  puff: () => void
}

function scriptFrom(start: Frame, track?: Track): Script {
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

  const walk = (to: number, step: number, gait: Gait) => {
    let skid = 0

    for (let index = 0; now.x !== to; ) {
      const direction = Math.sign(to - now.x)
      const room = Math.abs(to - now.x)
      const isIce =
        track !== undefined &&
        step === WALK_STEP &&
        (isOnIce(track, now.x) || isOnIce(track, now.x + direction * step))

      if (isIce || skid > 0) {
        skid = isIce ? 2 : skid - 1
        put(1, { x: now.x + direction * Math.min(isIce ? 2 * step : step, room), legs: 'stand', arms: 'out' })
        continue
      }
      const [legs, arms]: readonly [Legs, Arms] = gait[index % gait.length] ?? ['stand', 'rest']

      put(1, { x: now.x + direction * Math.min(step, room), legs, arms })
      index++
    }
    put(0, { legs: 'stand', arms: 'rest' })
  }

  const jump = (heights: readonly number[], dx: number, windUp: number) => {
    put(windUp, { crouch: true, legs: 'tuck' })

    for (const hop of heights) {
      put(1, { hop, x: now.x + dx, crouch: false, legs: 'stand', arms: 'up' })
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

  return { frames, now: () => now, put, blink, walk, jump, puff }
}

// The scarf's end streams behind whatever way the character moves, its tip flapping a
// frame at a time, and hangs still when the character stands.
function dressed(frames: readonly Frame[], isLoop: boolean): Frame[] {
  let flaps = 0

  return frames.map((frame, index) => {
    const before = index > 0 ? frames[index - 1] : isLoop ? frames[frames.length - 1] : undefined
    const dx = before === undefined ? 0 : frame.x - before.x

    if (dx === 0) {
      return { ...frame, scarf: 'still' }
    }
    flaps++

    const isUp = flaps % 2 === 1
    const scarf: Scarf = dx > 0 ? (isUp ? 'blowL1' : 'blowL2') : isUp ? 'blowR1' : 'blowR2'

    return { ...frame, scarf }
  })
}

/**
 * The chase for a track `width` CSS pixels wide: one loop of the story.
 */
export function storyOf(width: number): Story {
  const track = trackOf(width)
  const script = scriptFrom(HOME, track)
  const { put, blink, walk, jump, puff } = script
  const { home, sparkHome, far, stop } = track

  // At home beside the spark. A snowflake drifts down onto the spark while the
  // character watches it; the spark shakes it off, and the character bounces twice.
  put(seconds(1.5))
  blink()
  put(seconds(0.4))

  const flakeX = sparkHome + SPARK_BOX / 2 - UNIT
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
  walk(stop, RUN_STEP, RUN)
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

  // Home it walks: across the ice in a slide, then a stop to wave to the snowman, who
  // waves back.
  walk(track.greet, WALK_STEP, WALK)
  put(seconds(0.3), { eyes: 'left' })

  for (let wave = 0; wave < 2; wave++) {
    put(3, { arms: 'up', pal: 'rest' })
    put(3, { arms: 'rest', pal: 'wave' })
  }
  put(3, { pal: 'rest' })
  put(seconds(0.2), { eyes: 'ahead' })
  walk(home, WALK_STEP, WALK)

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

  // The spark keeps about one speed, whatever the track's length.
  const distance = far - sparkHome

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
const ROBIN_PERCH = { x: HOME.x + 5 * UNIT, y: TOP - 3 * UNIT }
const ROBIN_AWAY = { x: 45 * UNIT, y: -6 * UNIT }

/**
 * At work, at home beside the spark: the laptop comes up, then the typing loops.
 */
export function workingOf(): Reel {
  const intro = scriptFrom(HOME)

  // "!": there is work. The laptop comes up out of the snow, and it looks down at it.
  intro.put(1, { crouch: true, legs: 'tuck', say: 'alert' })
  intro.put(4, { crouch: false, legs: 'stand' })
  intro.put(1, { say: 'none', laptop: 'closed' })
  intro.put(1, { laptop: 'half' })
  intro.put(1, { laptop: 'open', eyes: 'down' })
  intro.put(2)

  const loop = scriptFrom(intro.now())
  const { put, blink } = loop

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
 * A mood's reel on a track `width` CSS pixels wide. An ending plays on into the chase,
 * so the band runs on as it should whenever the switch back to the chase comes.
 */
export function reelOf(width: number, mood: Mood, story: Story = storyOf(width)): Reel {
  if (mood === 'working') {
    return workingOf()
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

// The footprints of a chase: where a foot comes down as the character walks or runs,
// one print to a slot 8 pixels wide and none on the ice, with the frames it is made on.
export function printsOf(story: Story, track: Track): Map<number, number[]> {
  const { frames } = story
  const prints = new Map<number, number[]>()

  frames.forEach((frame, index) => {
    const before = frames[(index - 1 + frames.length) % frames.length]

    if (before === undefined || before.x === frame.x || frame.hop > 0) {
      return
    }
    const columns = frame.legs === 'a' ? [4, 11] : frame.legs === 'b' ? [6, 13] : []

    for (const column of columns) {
      const at = 4 * UNIT * Math.round((frame.x + column * UNIT) / (4 * UNIT))
      const isOff = at < 0 || at + UNIT > track.width || (at + UNIT > track.iceStart && at < track.iceEnd)

      if (isOff) {
        continue
      }
      const made = prints.get(at) ?? []
      const last = made[made.length - 1]

      // A foot stays down for two frames: one print.
      if (last === undefined || index - last > 2) {
        made.push(index)
      }
      prints.set(at, made)
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

export type Ember = { x: number; y: number; at: number; fill: string }

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
    const center = spark.far + (spark.home - spark.far) * along + SPARK_BOX / 2
    const [dx, dy] = offsets[index % offsets.length] ?? [0, 0]

    embers.push({
      x: Math.round(center) + dx,
      y: SPARK_CENTER_Y + dy,
      at: spark.back + index,
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

// How long a footprint takes to melt, and how dark it is when new.
const MELT = seconds(5)
const PRINT_DEPTH = 0.7

// A footprint's keyframes over a loop of `total` frames: dark the frame a foot comes
// down on it, then fading evenly, around the end of the loop too. Only the frames
// where the fading turns are written; the browser draws the straight lines between.
function meltOf(name: string, made: readonly number[], total: number): string {
  const depthAt = (frame: number) => {
    let depth = 0

    for (const stamp of made) {
      const age = (((frame - stamp) % total) + total) % total

      if (age < MELT) {
        depth = Math.max(depth, PRINT_DEPTH * (1 - age / MELT))
      }
    }

    return depth
  }
  const depths = Array.from({ length: total + 1 }, (_, frame) => depthAt(frame % total))
  let text = `@keyframes ${name}{`

  depths.forEach((depth, frame) => {
    const before = depths[frame - 1]
    const after = depths[frame + 1]
    const isTurn = before === undefined || after === undefined || Math.abs(depth - before - (after - depth)) > 1e-9

    if (isTurn) {
      text += `${percent(frame, total)}{opacity:${Number(depth.toFixed(2))}}`
    }
  })

  return `${text}}`
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

// The chase's two rolls of the spark, out and back.
function rollCssOf({ frames, spark }: Story): string {
  const total = frames.length
  // As far round as a wheel of the spark's size turns over the distance.
  const turn = Math.round(((spark.far - spark.home) / (2 * Math.PI * SPARK_RADIUS)) * 360)
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
    rollOf('spark-x', isFar => `transform:translateX(${isFar ? spark.far : spark.home}px)`) +
    rollOf('spark-spin', isFar => `transform:rotate(${isFar ? turn : 0}deg)`)
  )
}

// The spark in each mood. In the chase it rolls, and wobbles under the snowflake. At
// work it stays home, winds up into a whirl and glows. At a turn's end its glow fades
// and it spins down to rest, hopping with the character for joy, and the chase's
// moves wait for the intro to end.
function sparkCssOf(mood: Mood, reel: Reel, story: Story): string {
  const home = `.spark-x{transform:translateX(${story.spark.home}px)`
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
    // Speeding up evenly over the intro, it turns half as far as the whirl would.
    const windUp = ((360 / WHIRL_SECONDS) * (reel.intro.length / FPS)) / 2

    return [
      `${home}}`,
      `.spark-wind{animation:spark-wind ${intro} ${SPIN_UP} forwards}`,
      `@keyframes spark-wind{from{transform:rotate(0deg)}to{transform:rotate(${windUp.toFixed(2)}deg)}}`,
      `.spark-spin{animation:spark-whirl ${WHIRL_SECONDS}s linear ${intro} infinite}`,
      '@keyframes spark-whirl{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
      `.glow{opacity:0.5;animation:glow-in ${intro} ease-out forwards,glow 1.8s ease-in-out ${intro} infinite}`,
      '@keyframes glow-in{from{opacity:0;transform:scale(0.6)}to{opacity:0.5;transform:scale(0.9)}}',
      '@keyframes glow{0%,100%{opacity:0.5;transform:scale(0.9)}50%{opacity:0.85;transform:scale(1.05)}}',
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
function confettiOf(width: number): Layer {
  let svg = ''

  for (let index = 0, count = Math.round(width / 22); index < count; index++) {
    const x = even((((index * 37) % 100) / 100) * (width - 8) + 4)
    const loop = 3 + ((index * 7) % 5) * 0.4
    const delay = (((index * 13) % 10) / 10) * loop
    const drift = ((index % 3) - 1) * 2 * UNIT

    svg +=
      `<rect class="confetti" x="${x}" y="${-UNIT}" width="${UNIT}" height="${UNIT}" fill="${CONFETTI[index % CONFETTI.length]}" ` +
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
function lanternOf(width: number): Layer {
  return {
    svg:
      `<g class="px" transform="translate(${even(width * 0.5)} 0)">` +
      `<circle class="lantern-lit" cx="${2.5 * UNIT}" cy="${4 * UNIT}" r="${4 * UNIT}" fill="${LANTERN_GLOW}" fill-opacity="0.3"/>` +
      `<path fill="${LANTERN_GOLD}" d="${pathOf(LANTERN.frame)}"/>` +
      `<path class="lantern-lit" fill="${LANTERN_GLOW}" d="${pathOf(LANTERN.glass)}"/></g>`,
    css:
      '.lantern-lit{animation:flicker 1.7s step-end infinite}' +
      '@keyframes flicker{0%{opacity:1}23%{opacity:0.78}31%{opacity:1}64%{opacity:0.88}71%{opacity:1}}',
  }
}

// Everything that moves: what reduced motion holds still, and /winter calm too.
const MOVING =
  '.m,.ray,.spark-x,.spark-hop,.spark-tilt,.spark-wind,.spark-spin,.glow,.print,.ember,.glint,.confetti,.lantern-lit'

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

/**
 * The band's drawing in a mood, for a track `width` CSS pixels wide. `calm`, as the
 * person asks with /winter calm, holds it still on its still frame, with no answer to
 * the pointer. `occasion` dresses it: a party hat and confetti for New Year, a lantern
 * for Ramadan.
 */
export function bandOf(
  width: number,
  mood: Mood = 'idle',
  { calm = false, occasion = 'none' }: { calm?: boolean; occasion?: Occasion } = {},
): string {
  const story = storyOf(width)
  const track = trackOf(width)
  const reel = reelOf(width, mood, story)
  const { intro, loop, poster } = reel
  const frames = [...intro, ...loop]
  // The spark glows at work and fades out of it, and has no glow in the chase or asleep.
  const isLit = mood !== 'idle' && mood !== 'sleep'
  // The footprints and the shed sparks follow the chase, which work and sleep have none of.
  const isChase = mood !== 'working' && mood !== 'sleep'
  const chaseLoop = secondsOf(story.frames.length)
  const chaseDelay = secondsOf(intro.length)

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

  // The footprints in the snow, and the sparks shed on the dash home.
  let marks = ''
  let marksCss = ''
  let embers = ''

  if (isChase) {
    ;[...printsOf(story, track)].forEach(([at, made], index) => {
      marksCss += meltOf(`print-${index}`, made, story.frames.length)
      marks += `<rect class="print" x="${at}" y="${BAND_HEIGHT - GROUND}" width="${UNIT}" height="${GROUND}" fill="${PRINT}" style="animation-name:print-${index}"/>`
    })
    trailOf(story).forEach((ember, index) => {
      const total = story.frames.length

      marksCss +=
        `@keyframes ember-${index}{0%{opacity:0}${percent(ember.at - 0.5, total)}{opacity:0}` +
        `${percent(ember.at, total)}{opacity:1}${percent(ember.at + 5, total)}{opacity:0}100%{opacity:0}}`
      embers += `<rect class="ember" x="${ember.x - 1}" y="${ember.y - 1}" width="${UNIT}" height="${UNIT}" fill="${ember.fill}" style="animation-name:ember-${index}"/>`
    })
  }

  // What the occasion brings: confetti for New Year, a lantern for Ramadan.
  const confetti = occasion === 'newyear' ? confettiOf(width) : { svg: '', css: '' }
  const lantern = occasion === 'ramadan' ? lanternOf(width) : { svg: '', css: '' }
  const css = [
    timing,
    '.hidden{opacity:0}',
    '.px,.print,.ember{shape-rendering:crispEdges}',
    `.walker{transform:translate(${poster.x}px,${TOP}px);animation-name:${namesOf('walker', reel)}}`,
    `.jumper{transform:translateY(${-poster.hop}px);animation-name:${namesOf('jumper', reel)}}`,
    `.body{transform:translateY(${poster.crouch ? UNIT : 0}px);animation-name:${namesOf('body', reel)}}`,
    tracksOf('walker', reel, frame => `transform:translate(${frame.x}px,${TOP}px)`),
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
    sparkCssOf(mood, reel, story),
    // Each footprint and shed spark runs its own keyframes on the chase's clock.
    `.print,.ember{opacity:0;animation-duration:${chaseLoop};animation-delay:${chaseDelay};animation-timing-function:linear;animation-iteration-count:infinite}`,
    marksCss,
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
  const foot = BAND_HEIGHT - GROUND
  const ice = track.iceEnd - track.iceStart
  const ground =
    `<rect class="px" x="0" y="${foot}" width="${width}" height="${GROUND / 2}" fill="${GROUND_EDGE}"/>` +
    `<rect class="px" x="0" y="${foot + GROUND / 2}" width="${width}" height="${GROUND / 2}" fill="${GROUND_SNOW}"/>` +
    `<rect class="px" x="${track.iceStart}" y="${foot}" width="${ice}" height="${GROUND / 2}" fill="${ICE_EDGE}"/>` +
    `<rect class="px" x="${track.iceStart}" y="${foot + GROUND / 2}" width="${ice}" height="${GROUND / 2}" fill="${ICE}"/>` +
    `<rect class="glint px" x="${track.iceStart + 4 * UNIT}" y="${foot}" width="${2 * UNIT}" height="${GROUND / 2}" fill="${GLINT}"/>`
  const snowman =
    `<g class="px" transform="translate(${track.snowman} ${TOP})">` +
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

  // Back to front: the snow and its footprints, the snowman, the shadow, the shed
  // sparks under the spark, the snowflake on it, the character and its laptop, and the
  // robin on its hat.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${BAND_HEIGHT}" width="${width}" height="${BAND_HEIGHT}">
<style>
${css}
</style>${defs}
${ground}${marks}
${snowman}${lantern.svg}
<g class="m walker px" fill-opacity="0.22">${shadows.svg}</g>
${embers}
<g class="spark-x"><g class="spark-hop"><g transform="translate(${SPARK_BOX / 2} ${SPARK_CENTER_Y})">${glow}<g class="spark-tilt"><g class="spark-wind"><g class="spark-spin">${raysOf()}</g></g></g></g></g></g>
${hasFlake ? `<g class="m flake-at px">${flake.svg}</g>` : ''}${confetti.svg}
<g class="m walker px"><g class="poke"><g class="m jumper">${legs.svg}<g class="m body"><path fill="${ORANGE}" d="${pathOf(BODY)}"/>${clothes}${tail.svg}${tailStripe.svg}${arms.svg}${eyes.svg}${answer.body}</g>${breath.svg}${words.svg}${love.svg}${snores.svg}${tick.svg}${answer.over}</g></g>${lid.svg}${hinge.svg}${logo.svg}</g>
${hasRobin ? `<g class="m robin-at px">${robin.map(layer => layer.svg).join('')}</g>` : ''}
</svg>`
}
