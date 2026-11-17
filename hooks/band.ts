// The row above the prompt: Claude's pixel character and the small orange spark share
// one track. The spark moves smoothly. The character moves the way an old game's sprite
// does: a whole frame at a time, twelve frames a second, on a grid of pixels.
//
// The band has a mood, and each mood is a reel: an intro played once, then a loop.
//
// - idle, the chase: the two rest side by side, and the spark rolls off to the far end.
//   The character starts ("!"), scuttles after it and pounces, and the spark darts back
//   home under the jump. Puzzled ("?"), the character walks home, stops halfway for a
//   look back, and greets the spark with a heart.
// - working, while Claude works: "!", a laptop comes up out of the snow, and the
//   character types, stops to think ("..."), glances at the spark and types on. The
//   spark winds up into a steady whirl and glows.
// - joy, puzzled and closing, as a turn ends with an answer, without one, or stopped:
//   the character folds the laptop away and cheers with a tick, wonders ("?") or just
//   stands, while the spark spins down. Then the chase starts over.

import {
  ARMS,
  BODY,
  EYE,
  EYES,
  HEART,
  HINGE,
  HINGE_GRAY,
  LEGS,
  LID,
  LID_GRAY,
  LOGO,
  ORANGE,
  SAY,
  SHADE,
  SHADOW,
  SPRITE_HEIGHT,
  SPRITE_WIDTH,
  TICK,
  UNIT,
  balloonOf,
  pathOf,
} from './sprite'
import type { Laptop, Rect } from './sprite'

export const BAND_HEIGHT = 32

// The character's frame rate.
export const FPS = 12

export type Mood = 'idle' | 'working' | 'joy' | 'puzzled' | 'closing'
export type Ending = Exclude<Mood, 'idle' | 'working'>

// The band in words, for a screen reader: what it shows, and in a mood what that means.
export const ALT: Readonly<Record<Mood, string>> = {
  idle: "Claude's pixel character chasing a small orange spark along the band",
  working: "Claude's pixel character typing at a laptop while the spark spins: Claude is working",
  joy: "Claude's pixel character jumping for joy beside the spark: Claude has answered",
  puzzled: "Claude's pixel character puzzled beside the spark: the turn ended without an answer",
  closing: "Claude's pixel character folding its laptop away beside the spark: the turn was stopped",
}

// The sprite's top row while it stands on the ground.
const TOP = BAND_HEIGHT - SPRITE_HEIGHT

// The spark: a box 24 pixels square, its rays reaching 10 pixels from the center.
const SPARK_BOX = 24
const SPARK_RADIUS = 10
const SPARK_CENTER_Y = BAND_HEIGHT - 1 - SPARK_RADIUS

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
  walk: (to: number, step: number, gait: Gait) => void
  // A crouch, a frame for each height on the way up and down, and a crouch to land.
  jump: (heights: readonly number[], dx: number, windUp: number) => void
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

  const walk = (to: number, step: number, gait: Gait) => {
    for (let index = 0; now.x !== to; index++) {
      const [legs, arms]: readonly [Legs, Arms] = gait[index % gait.length] ?? ['stand', 'rest']
      const dx = Math.sign(to - now.x) * Math.min(step, Math.abs(to - now.x))

      put(1, { x: now.x + dx, legs, arms })
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

  return { frames, now: () => now, put, blink, walk, jump }
}

/**
 * The chase for a track `width` CSS pixels wide: one loop of the story.
 */
export function storyOf(width: number): Story {
  const script = scriptFrom(HOME)
  const { put, blink, walk, jump } = script

  const home = HOME.x
  const sparkHome = home + SIDE_BY_SIDE
  const far = width - SPARK_BOX
  // A whole number of running steps, stopping short of the spark.
  const stop = home + Math.floor((far - SIDE_BY_SIDE - home) / RUN_STEP) * RUN_STEP

  // At home beside the spark: blinks, a glance at it, two small bounces.
  put(seconds(1.5))
  blink()
  put(seconds(1.2))
  put(seconds(1), { eyes: 'right' })
  put(seconds(0.8), { eyes: 'ahead' })
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

  // It scuttles after it and stops short.
  walk(stop, RUN_STEP, RUN)
  put(seconds(0.6))

  // It pounces, and the spark darts back home the moment it crouches.
  const back = script.frames.length

  jump([6, 10, 12, 12, 10, 6], RUN_STEP, 2)

  // Missed: "?", a look after the spark, a blink.
  put(seconds(0.3))
  put(seconds(0.7), { say: 'ask' })
  put(seconds(0.5), { eyes: 'left' })
  blink()
  put(seconds(0.3), { say: 'none' })

  // It walks home, with a look back halfway.
  walk(home + UNIT * Math.round((script.now().x - home) / (2 * UNIT)), WALK_STEP, WALK)
  put(seconds(0.6), { eyes: 'right' })
  blink()
  put(seconds(0.3), { eyes: 'left' })
  walk(home, WALK_STEP, WALK)

  // Home again: a heart, and both arms waved.
  put(seconds(0.3), { eyes: 'right' })

  for (let wave = 0; wave < 3; wave++) {
    put(3, { arms: 'up', say: 'love' })
    put(3, { arms: 'rest' })
  }
  put(seconds(0.6))
  put(seconds(0.6), { say: 'none', eyes: 'ahead' })

  // The spark keeps about one speed, whatever the track's length.
  const distance = far - sparkHome

  return {
    frames: script.frames,
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

  return { intro: intro.frames, loop: loop.frames, poster: loop.frames[0] ?? HOME }
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

// The spark rolls out smoothly, and darts back fast at first, slowing as it nears home.
const ROLL = 'cubic-bezier(0.45,0,0.55,1)'
const DART = 'cubic-bezier(0.2,0.7,0.3,1)'
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

// The spark in each mood. In the chase it rolls. At work it stays home, winds up into a
// whirl and glows. At a turn's end its glow fades and it spins down to rest, hopping
// with the character for joy, and the chase's rolls wait for the intro to end.
function sparkCssOf(mood: Mood, reel: Reel, story: Story): string {
  const home = `.spark-x{transform:translateX(${story.spark.home}px)`
  const loop = secondsOf(story.frames.length)
  const intro = secondsOf(reel.intro.length)

  if (mood === 'idle') {
    return [
      `${home};animation:spark-x ${loop} linear infinite}`,
      `.spark-spin{animation:spark-spin ${loop} linear infinite}`,
      rollCssOf(story),
    ].join('\n')
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
    rollCssOf(story),
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

/**
 * The band's drawing in a mood, for a track `width` CSS pixels wide.
 */
export function bandOf(width: number, mood: Mood = 'idle'): string {
  const story = storyOf(width)
  const reel = reelOf(width, mood, story)
  const { intro, loop, poster } = reel
  const isLit = mood !== 'idle'

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

  const css = [
    timing,
    '.hidden{opacity:0}',
    '.px{shape-rendering:crispEdges}',
    `.walker{transform:translate(${poster.x}px,${TOP}px);animation-name:${namesOf('walker', reel)}}`,
    `.jumper{transform:translateY(${-poster.hop}px);animation-name:${namesOf('jumper', reel)}}`,
    `.body{transform:translateY(${poster.crouch ? UNIT : 0}px);animation-name:${namesOf('body', reel)}}`,
    tracksOf('walker', reel, frame => `transform:translate(${frame.x}px,${TOP}px)`),
    tracksOf('jumper', reel, frame => `transform:translateY(${-frame.hop}px)`),
    tracksOf('body', reel, frame => `transform:translateY(${frame.crouch ? UNIT : 0}px)`),
    shadows.css,
    legs.css,
    arms.css,
    eyes.css,
    words.css,
    love.css,
    tick.css,
    lid.css,
    hinge.css,
    logo.css,
    sparkCssOf(mood, reel, story),
    `.ray{stroke:${ORANGE};stroke-width:2.1;stroke-linecap:round;animation:breathe ${mood === 'working' ? 1.3 : 2.6}s ease-in-out infinite}`,
    '@keyframes breathe{0%,100%{transform:scaleX(1)}50%{transform:scaleX(0.7)}}',
    '@media (prefers-reduced-motion: reduce){.m,.ray,.spark-x,.spark-hop,.spark-wind,.spark-spin,.glow{animation:none}}',
  ].join('\n')

  // The glow: soft orange, fading out from the spark's heart.
  const defs = isLit
    ? `<defs><radialGradient id="glow"><stop offset="0" stop-color="${ORANGE}" stop-opacity="0.65"/><stop offset="1" stop-color="${ORANGE}" stop-opacity="0"/></radialGradient></defs>`
    : ''
  const glow = isLit ? `<circle class="glow" r="${SPARK_RADIUS + 3}" fill="url(#glow)"/>` : ''

  // The shadow lies under the spark, the spark rolls behind the character, and the
  // laptop stands in front of it.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${BAND_HEIGHT}" width="${width}" height="${BAND_HEIGHT}">
<style>
${css}
</style>${defs}
<g class="m walker px" fill-opacity="0.22">${shadows.svg}</g>
<g class="spark-x"><g class="spark-hop"><g transform="translate(${SPARK_BOX / 2} ${SPARK_CENTER_Y})">${glow}<g class="spark-wind"><g class="spark-spin">${raysOf()}</g></g></g></g></g>
<g class="m walker px"><g class="m jumper">${legs.svg}<g class="m body"><path fill="${ORANGE}" d="${pathOf(BODY)}"/>${arms.svg}${eyes.svg}</g>${words.svg}${love.svg}${tick.svg}</g>${lid.svg}${hinge.svg}${logo.svg}</g>
</svg>`
}
