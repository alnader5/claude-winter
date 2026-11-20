import type { ThemeSetArgs } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { FoundElement, TestBody } from 'claude-code/testing'

import {
  ALT,
  BAND_HEIGHT,
  ENDING_MS,
  HELPER_SPAN,
  HOME,
  MAX_HOP,
  MAX_WIDTH,
  MIN_WIDTH,
  REFERENCE_WIDTH,
  TRACK,
  bandOf,
  endingOf,
  helperAt,
  isOnIce,
  FLAKE_ON_HAT,
  FLAKE_ON_SPARK,
  introMsOf,
  openingMsOf,
  polished,
  campAt,
  flagAt,
  endingMsOf,
  CAMP_WIDTH,
  FLAG_BEHIND,
  SNOWMAN_REACH,
  pixelsOf,
  printsOf,
  reelOf,
  shovelingOf,
  sleepingOf,
  storyOf,
  trailOf,
  workingOf,
} from '../hooks/band'
import type { Frame, Place } from '../hooks/band'
import { KEPT_DRAWINGS, drawn, keptDrawings } from '../hooks/drawings'
import { checkColors } from '../hooks/make-colors.js'
import { sceneOf } from '../hooks/scene'
import {
  BLUSH_PINK,
  CARROT,
  COAL,
  KNIT_PINK,
  KNIT_RED,
  LANTERN_GOLD,
  LID_GRAY,
  PARTY_GOLD,
  PARTY_PURPLE,
  SPRITE_WIDTH,
  STRIPE,
  SWEAT_BLUE,
  TICK,
  TREK_FLAG,
  UNIT,
  pathOf,
} from '../hooks/sprite'
import { cheerOf } from '../hooks/git'
import { GIFTS_AT, builtOn, dayOf, snowmanOf, type Build } from '../hooks/snowman'
import { PLAYERS, PLAY_WAV, RETRY_AFTER_MS, fileOf, systemOf } from '../hooks/sound'
import { whenOf } from '../hooks/time'
import { toneOf } from '../hooks/tone'
import {
  MAX_HELPERS,
  MAX_TREK,
  WORK_ALT,
  activityOf,
  driftOf,
  heatOf,
  trekOf,
  workAltOf,
  type Activity,
  type Tone,
} from '../hooks/work'

const GLASS = { blur: 4, opacity: 0.64 }

const BACKDROP = {
  plugin: 'winter',
  component: 'Backdrop',
  requestId: 'backdrop',
  props: { scene: 'snowfall', plugin: 'winter', glass: GLASS },
} as const

const BAND = {
  plugin: 'winter',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 9 },
    view: {},
  },
} as const

// Under the limit an Svg's source is held to.
const SVG_LIMIT = 131072

// A plain midday on this machine's clock: no occasion, nobody asleep.
const NOON = new Date(2026, 10, 18, 12, 0).getTime()

// Widths the stage may have: its narrowest, a phone's, the one the frames are timed
// for, a desktop's, and its widest.
const WIDTHS = [MIN_WIDTH, 360, REFERENCE_WIDTH, 760, MAX_WIDTH]

const isAt = (place: Place, other: Place) => place.px === other.px && place.of === other.of

// The rules every frame keeps, in every mood and at every width: on the stage, no
// higher than the pom-pom allows, a balloon only on the ground, and no frame going
// further than a run's stride, which a wider stage lengthens in step with its track.
function expectOnTrack(frames: readonly Frame[], isLoop: boolean) {
  for (const width of WIDTHS) {
    const stride = 2 * UNIT * Math.max(1, (width - 64) / (REFERENCE_WIDTH - 64)) + 1e-6

    frames.forEach((frame, index) => {
      const next = (isLoop ? frames[(index + 1) % frames.length] : frames[index + 1]) ?? frame
      const x = pixelsOf(frame.x, width)

      expect(x >= 0 && x + SPRITE_WIDTH <= width).toBe(true)
      expect(Math.abs(pixelsOf(next.x, width) - x) <= stride).toBe(true)
    })
  }
  frames.forEach(frame => {
    expect(frame.hop >= 0 && frame.hop <= MAX_HOP).toBe(true)
    expect(frame.say === 'none' || frame.hop === 0).toBe(true)
  })
}

test('the session starts with the whole look, and its colors have no problem', async ($, on) => {
  let look: ThemeSetArgs | undefined

  mock.clock(on, { now: NOON })
  mock.store(on)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  // Each hook here stands for the engine: it records the look and says a client draws it.
  on('theme.set', (_, e) => {
    look = e

    return { value: { isDrawn: true, requestId: 'backdrop' } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  expect(look?.backdrop).toEqual({ scene: 'snowfall', glass: GLASS })
  expect(look?.overrideColorScheme).toBeUndefined()
  expect(look?.colors?.label).toBe('Winter')
  expect(Object.keys(look?.colors?.inputs ?? {})).toEqual(['light', 'dark'])
  // No shape problem and no pair of colors under the design system's contrast.
  expect(checkColors(look?.colors)).toEqual([])
})

test('the backdrop is the snowfall where a surface draws scenes', async $ => {
  for (const surface of ['desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BACKDROP, surface })
    const svg = await ui.find({ type: 'Svg' })

    expect(svg?.props.alt).toBe('Snow falling slowly over low hills and pines')
    expect(String(svg?.props.source)).toMatch(/^<svg [^>]*viewBox="0 0 1600 1000"/)
    expect(String(svg?.props.source).length < SVG_LIMIT).toBe(true)
    await ui.unmount()
  }
})

test("another mod's scene is left alone", async $ => {
  const ui = await $.ui.mount({
    ...BACKDROP,
    props: { ...BACKDROP.props, scene: 'lagoon', plugin: 'other' },
    surface: 'desktop',
  })

  expect(await ui.find({ type: 'Svg' })).toBeUndefined()
  await ui.unmount()
})

test("Claude's pixel character and the spark share a band as wide as its slot", async $ => {
  const sources: string[] = []

  for (const surface of ['desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    const svg = await ui.find({ type: 'Svg' })
    const source = String(svg?.props.source)

    // The widest the stage can be: the desktop holds the frame to its slot, and the
    // drawing fits the stage to the frame, between the narrowest and the widest.
    expect(svg?.props).toMatchObject({ width: MAX_WIDTH, height: BAND_HEIGHT, isInteractive: true })
    expect(source).toMatch(new RegExp(`^<svg [^>]*width="${MAX_WIDTH}" height="${BAND_HEIGHT}"`))
    expect(source).toContain(`--w:max(${MIN_WIDTH}px,min(100vw,${MAX_WIDTH}px));width:var(--w)`)
    expect(svg?.props.alt).toBe("Claude's pixel character chasing a small orange spark along the band")
    expect(source).toContain('#d97757')
    // The sprite's pixels stay square and sharp, and its limbs move a frame at a time.
    expect(source).toContain('shape-rendering:crispEdges')
    expect(source).toContain('animation-timing-function:step-end')
    // The spark rolls to the far end of the stage, whatever its width: its keyframes move
    // a share of the width and some pixels, and a rule turns them into a place live.
    expect(source).toContain('--of:1;--px:-24px')
    expect(source).toContain('.spark-x{--of:0;--px:40px;transform:translateX(calc(var(--of) * var(--w) + var(--px)))')
    expect(source).toContain("@property --of{syntax:'&lt;number&gt;';inherits:false;initial-value:0}")
    // The style is plain text in the markup, so a scrub or an XML parser reads it whole.
    expect(source.slice(source.indexOf('<style>') + 7, source.indexOf('</style>'))).not.toMatch(/[<>]/)
    // Dressed for the cold, beside a snowman begun: on a first day, a snowball.
    expect(source).toContain(KNIT_RED)
    expect(source).toContain(STRIPE)
    expect(source).toContain('<g class="px snowman">')
    expect(source).not.toContain(CARROT)
    // Nothing of the work is drawn in the chase: no laptop, no glow.
    expect(source).not.toContain(LID_GRAY)
    expect(source).not.toContain('class="glow"')
    expect(source.length < SVG_LIMIT).toBe(true)
    sources.push(source)
    await ui.unmount()
  }

  // One drawing serves a desktop and a phone alike.
  expect(sources[0]).toBe(sources[1])
})

test('no keyframe holds the width, so the moves follow the frame as it widens', () => {
  for (const mood of ['idle', 'working', 'joy', 'puzzled', 'closing', 'sleep'] as const) {
    const source = bandOf(mood)
    const keyframes = source.match(/@keyframes [^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g) ?? []

    expect(keyframes.length > 0).toBe(true)
    // A width worked out into a keyframe is the one the browser may keep: none here.
    expect(keyframes.filter(block => block.includes('var(--w)') || /\d+vw/.test(block))).toEqual([])
  }
})

test('the character moves along the stage and stays on it, at any width', () => {
  const { frames, spark } = storyOf()

  // The loop closes where it opened, standing at home beside the spark.
  expect(frames[frames.length - 1]).toEqual(frames[0])
  expect(frames[0]).toEqual(HOME)
  expect(spark.home).toEqual({ px: HOME.x.px + 38, of: 0 })
  expectOnTrack(frames, true)

  for (const width of WIDTHS) {
    // The spark rolls to the right edge, and the character runs to stop short of it.
    expect(pixelsOf(spark.far, width) + 24).toBe(width)
    expect(Math.max(...frames.map(frame => pixelsOf(frame.x, width) + SPRITE_WIDTH))).toBeLessThanOrEqual(width)
    expect(frames.some(frame => isAt(frame.x, TRACK.stop))).toBe(true)
  }

  // The spark's rolls come in order inside the loop.
  expect(0 < spark.out && spark.out + spark.outFrames < spark.back).toBe(true)
  expect(spark.back + spark.backFrames < frames.length).toBe(true)
  // It is out at the far end before the character gets near, and home before it returns.
  const near = pixelsOf(spark.far, REFERENCE_WIDTH) - 38 - 2 * UNIT

  expect(frames.findIndex(frame => pixelsOf(frame.x, REFERENCE_WIDTH) >= near) > spark.out + spark.outFrames).toBe(
    true,
  )
  expect(
    frames.findIndex((frame, index) => index > spark.back && isAt(frame.x, HOME.x)) > spark.back + spark.backFrames,
  ).toBe(true)
})

test('a snowflake lands on the spark, which shakes it off before it rolls away', () => {
  const { frames, spark } = storyOf()
  const shaken = frames.findIndex(frame => frame.tilt !== 0)

  // It comes down from over the band, and rests on the spark until the spark shakes.
  expect(frames.find(frame => frame.flake !== null)?.flake?.y).toBeLessThan(0)
  expect(frames[shaken - 1]?.flake?.pose).toBe('whole')
  expect(frames[shaken - 1]?.eyes).toBe('right')
  // Gone, and the spark still again, well before the spark rolls out.
  expect(frames.slice(shaken + 6, spark.out).every(frame => frame.flake === null && frame.tilt === 0)).toBe(true)
  expect(shaken + 6 < spark.out).toBe(true)
})

test('home together again, the spark bounces a snowflake higher and higher, then onto the hat', () => {
  const { frames, spark } = storyOf()
  const popped = frames.findIndex((frame, index) => index > spark.back && frame.sparkScale > 1)
  const start = frames.findIndex((frame, index) => index > popped && frame.flake !== null)
  const play = frames.slice(start)
  const hops = play.filter((frame, index) => frame.sparkDip < 0 && (play[index - 1]?.sparkDip ?? 0) >= 0)
  const landed = play.findIndex(
    frame => frame.flake?.x === FLAKE_ON_HAT.x && frame.flake.y === FLAKE_ON_HAT.y && frame.flake.pose === 'whole',
  )

  // After the greeting, at home: down from over the band onto the spark.
  expect(start > popped + 30).toBe(true)
  expect(play.every(frame => isAt(frame.x, HOME.x))).toBe(true)
  expect((play[0]?.flake?.y ?? 0) < 0).toBe(true)
  expect(play.some(frame => frame.flake?.x === FLAKE_ON_SPARK.x && frame.flake.y === FLAKE_ON_SPARK.y)).toBe(true)

  // Three bounces and the last hop, each hop after the spark gathers itself, the flake
  // higher each time.
  expect(hops.length).toBe(4)

  const tops = [0, 1, 2].map(bounce => {
    const from = play.indexOf(hops[bounce] ?? play[0] ?? HOME)
    const to = play.indexOf(hops[bounce + 1] ?? play[0] ?? HOME)

    return Math.min(...play.slice(from, to).map(frame => frame.flake?.y ?? 99))
  })

  expect((tops[0] ?? 0) > (tops[1] ?? 0) && (tops[1] ?? 0) > (tops[2] ?? 0)).toBe(true)
  // The character watching it all the way, looking up as it flies.
  expect(play.filter(frame => frame.flake !== null).every(frame => ['up', 'right', 'shut'].includes(frame.eyes))).toBe(
    true,
  )

  // Onto the hat, looked up at, and melted away; the loop ends as it began.
  expect(landed > 0).toBe(true)
  expect(play[landed]?.eyes).toBe('up')
  expect(play.slice(landed).some(frame => frame.flake?.pose === 'bit')).toBe(true)

  const last = frames[frames.length - 1]

  expect(last?.flake).toBeNull()
  expect([last?.sparkDip, last?.sparkScale, last?.tilt]).toEqual([0, 1, 0])
  expect(bandOf('idle')).toContain('class="m flake-at px"')
})

test('the spark sneezes the flake off, and hides in the snow while the character walks home', () => {
  const { frames, spark } = storyOf()
  const choo = frames.findIndex(frame => frame.burst === 'sneeze1')

  // It swells, drawing in, then sneezes: small at once, a spray of sparks flying at the
  // character, who blinks.
  expect(frames[choo - 1]?.sparkScale).toBeGreaterThan(1)
  expect(frames[choo]?.sparkScale).toBeLessThan(1)
  expect(['sneeze1', 'sneeze2', 'sneeze3'].every(burst => frames.some(frame => frame.burst === burst))).toBe(true)
  expect(frames.slice(choo, choo + 4).some(frame => frame.eyes === 'shut')).toBe(true)

  // Home from its dash, it dives into the snow and stays under it until the character
  // comes home, when it pops out with a bounce and the character starts: "!".
  const gone = frames.findIndex(frame => frame.sparkScale === 0)
  const popped = frames.findIndex((frame, index) => index > gone && frame.sparkScale > 1)

  expect(gone > spark.back + spark.backFrames).toBe(true)
  expect(popped - gone > 10 * 12).toBe(true)
  expect(frames.slice(gone, popped - 1).every(frame => frame.sparkScale === 0 && frame.sparkDip > 0)).toBe(true)
  // It stirs under the snow now and then, so where it hides shows.
  expect(frames.slice(gone, popped - 1).filter(frame => frame.burst === 'snow1').length >= 6).toBe(true)
  expect(isAt(frames[popped + 1]?.x ?? TRACK.far, HOME.x)).toBe(true)
  expect(frames[popped + 1]?.say).toBe('alert')
  // Still once out, until it plays with a snowflake.
  const plays = frames.findIndex((frame, index) => index > popped && frame.flake !== null)

  expect(frames.slice(popped + 3, plays).every(frame => frame.sparkScale === 1 && frame.sparkDip === 0)).toBe(true)
  // Snow kicked up going in and coming out.
  expect(frames.slice(gone - 3, gone + 1).map(frame => frame.burst)).toEqual(['snow1', 'snow2', 'snow3', 'none'])
  expect(frames.slice(popped - 1, popped + 3).map(frame => frame.burst)).toEqual(['snow1', 'snow2', 'snow3', 'none'])

  // All of it on the chase's clock, and on the ending's after its intro.
  const chase = `${Number((frames.length / 12).toFixed(3))}s`

  expect(bandOf('idle')).toContain(`.spark-pose{animation:spark-pose ${chase} linear infinite}`)
  expect(bandOf('joy')).toContain(`.spark-pose{animation:spark-pose ${chase} linear `)
  expect(bandOf('working')).not.toContain('animation:spark-pose')
})

test('every move has its finish: the pom-pom lags, the body stretches and squashes, snow flies as it lands', () => {
  const chase = polished(storyOf().frames, true)
  const spring = chase.findIndex(frame => frame.hop === 10) - 2
  const lands = chase.findIndex((frame, index) => index > spring && frame.hop === 0)

  // The pounce: drawn out as it springs, squashed as it lands, snow about its feet.
  expect(chase[spring - 1]?.hop).toBe(0)
  expect(chase[spring]?.squash).toBe('stretch')
  expect(chase[lands]?.squash).toBe('squash')
  expect(chase.slice(lands, lands + 3).map(frame => frame.dust)).toEqual(['dust1', 'dust2', 'dust2'])
  expect(chase[lands + 3]?.dust).toBe('none')
  expect(chase.filter(frame => frame.squash === 'squash').length).toBe(chase.filter(frame => frame.squash === 'stretch').length)

  // The pom-pom lags behind each way it goes: up, down, right and left.
  chase.forEach((frame, index) => {
    const before = chase[(index - 1 + chase.length) % chase.length] ?? frame
    const dx = pixelsOf(frame.x, REFERENCE_WIDTH) - pixelsOf(before.x, REFERENCE_WIDTH)
    const expected =
      frame.hop > before.hop ? 'low' : frame.hop < before.hop ? 'high' : dx > 0 ? 'left' : dx < 0 ? 'right' : 'still'

    expect(frame.pom).toBe(expected)
  })

  // In the drawing: the squash from its feet, and no pom-pom on a party hat.
  expect(bandOf('idle')).toContain('scale(1.14,0.86)')
  expect(bandOf('idle')).toContain('transform-box:fill-box;transform-origin:50% 100%')
  expect(bandOf('idle')).toContain('class="m pom-left')
  expect(bandOf('idle', { occasion: 'newyear' })).not.toContain('class="m pom-')
  expect(bandOf('joy')).toContain('class="m dust-dust1')
})

test('it puffs in the cold after running, and its scarf streams behind it', () => {
  const { frames } = storyOf()
  const arrived = frames.findIndex(frame => isAt(frame.x, TRACK.stop))

  expect(frames.slice(arrived, arrived + 8).some(frame => frame.breath !== 'none')).toBe(true)

  frames.forEach((frame, index) => {
    const before = frames[(index - 1 + frames.length) % frames.length] ?? frame
    const dx = pixelsOf(frame.x, REFERENCE_WIDTH) - pixelsOf(before.x, REFERENCE_WIDTH)

    // Out to the left while it moves right, to the right while it moves left.
    expect(
      dx > 0 ? frame.scarf.startsWith('blowL') : dx < 0 ? frame.scarf.startsWith('blowR') : frame.scarf === 'still',
    ).toBe(true)
  })
})

test('the walk home slides across the ice and stops to wave to the snowman, at any width', () => {
  const { frames } = storyOf()

  for (const width of WIDTHS) {
    const slides = frames.filter(frame => frame.arms === 'out')

    // Sliding happens on the ice, or skidding a step or two past its edge.
    expect(slides.length > 0).toBe(true)
    expect(
      slides.every(frame => [-8, -6, -4, -2, 0, 2, 4, 6, 8].some(d => isOnIce({ ...frame.x, px: frame.x.px + d }, width))),
    ).toBe(true)
    // Walking home over the ice is all sliding: no step is taken on it.
    frames.forEach((frame, index) => {
      const before = frames[index - 1]

      if (before !== undefined && pixelsOf(frame.x, width) < pixelsOf(before.x, width) && isOnIce(frame.x, width)) {
        expect(frame.arms).toBe('out')
      }
    })
    // The ice clear of both stops, and the snowman clear of the spark at home.
    expect(isOnIce(TRACK.greet, width) || isOnIce(TRACK.stop, width)).toBe(false)
    expect(pixelsOf(TRACK.snowman, width) - 3 * UNIT > pixelsOf(TRACK.sparkHome, width) + 24).toBe(true)
  }

  // It waves at the snowman's side, looking at it, and the snowman waves back there.
  const waves = frames.filter(frame => frame.pal === 'wave')

  expect(waves.length > 0).toBe(true)
  expect(waves.every(frame => isAt(frame.x, TRACK.greet) && frame.eyes === 'left')).toBe(true)
  expect(frames.some(frame => isAt(frame.x, TRACK.greet) && frame.arms === 'up')).toBe(true)
})

test('footprints melt in the snow, never on the ice, and the spark sheds sparks on its dash', () => {
  const story = storyOf()
  const prints = printsOf(story)
  const embers = trailOf(story)
  const source = bandOf('idle')
  const iceStart = pixelsOf(TRACK.iceStart, REFERENCE_WIDTH)
  const iceEnd = pixelsOf(TRACK.iceEnd, REFERENCE_WIDTH)

  expect(prints.length > 10).toBe(true)
  for (const print of prints) {
    const at = pixelsOf(print.at, REFERENCE_WIDTH)

    expect(at + UNIT <= iceStart || at >= iceEnd).toBe(true)
  }
  // Shed on the dash home, one a frame, each about where the spark is then.
  expect(embers.length > 5).toBe(true)
  expect(
    embers.every(ember => ember.frame > story.spark.back && ember.frame < story.spark.back + story.spark.backFrames),
  ).toBe(true)
  for (const width of WIDTHS) {
    for (const ember of embers) {
      const at = pixelsOf(ember.at, width)

      expect(at > pixelsOf(story.spark.home, width) && at < width + 4 * UNIT).toBe(true)
    }
  }
  // Each one a mark of its own on one shared fade.
  expect((source.match(/class="print"/g) ?? []).length).toBe(prints.length)
  expect((source.match(/class="ember"/g) ?? []).length).toBe(embers.length)
  expect(source).toContain('@keyframes melt{')

  // The work leaves no tracks.
  expect(bandOf('working')).not.toContain('class="print"')
})

test('while Claude works, the character types at a laptop and the spark whirls', async $ => {
  for (const surface of ['desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, isWorking: true }, surface })
    const svg = await ui.find({ type: 'Svg' })
    const source = String(svg?.props.source)

    expect(svg?.props).toMatchObject({ width: MAX_WIDTH, height: BAND_HEIGHT, isInteractive: true })
    expect(svg?.props.alt).toBe(
      "Claude's pixel character typing at a laptop while the spark spins: Claude is working",
    )
    expect(source).toContain(LID_GRAY)
    expect(source).toContain('animation:spark-whirl 2.4s linear')
    expect(source).toContain('class="glow"')
    // The intro plays once, then the loop for good.
    expect(source).toContain('animation-iteration-count:1,infinite')
    expect(source.length < SVG_LIMIT).toBe(true)
    await ui.unmount()
  }

  const { intro, loop, poster } = workingOf()

  // From home, "!" before the laptop comes up, and the laptop open as the loop begins.
  expect(intro[0]).toEqual({ ...HOME, crouch: true, legs: 'tuck', say: 'alert' })
  expect(intro[intro.length - 1]).toMatchObject({ laptop: 'open', say: 'none' })
  // The whole loop at the laptop, on the ground at home: typing with both hands, and
  // thinking all three dots through.
  expect(loop.every(frame => isAt(frame.x, HOME.x) && frame.hop === 0 && frame.laptop === 'open')).toBe(true)
  expect(loop.some(frame => frame.arms === 'tapL') && loop.some(frame => frame.arms === 'tapR')).toBe(true)
  expect(['think1', 'think2', 'think3'].every(say => loop.some(frame => frame.say === say))).toBe(true)
  expect(poster).toMatchObject({ laptop: 'open' })
  expectOnTrack(intro, false)
  expectOnTrack(loop, true)
})

test('a robin visits the hat while Claude works, and never sits over its thoughts', () => {
  const { loop } = workingOf()
  const visit = loop.filter(frame => frame.robin !== null)

  expect(visit.some(frame => frame.robin?.pose === 'perch')).toBe(true)
  expect(visit.some(frame => frame.robin?.pose === 'peck')).toBe(true)
  // Up at it while it sits there, and no "..." under it.
  expect(visit.filter(frame => frame.robin?.pose === 'perch').every(frame => frame.eyes === 'up')).toBe(true)
  expect(visit.every(frame => frame.say === 'none')).toBe(true)
  // It comes and goes within the loop.
  expect(loop[0]?.robin).toBe(null)
  expect(loop[loop.length - 1]?.robin).toBe(null)
})

test('each ending folds the laptop away and lands where the chase begins', () => {
  for (const mood of ['joy', 'puzzled', 'closing'] as const) {
    const frames = endingOf(mood)
    const gone = frames.findIndex(frame => frame.laptop === 'none')
    const reel = reelOf(mood)
    const source = bandOf(mood)

    // From the laptop as the work left it, to home, standing.
    expect(frames[0]).toMatchObject({ x: HOME.x, laptop: 'open' })
    expect(frames[frames.length - 1]).toEqual(HOME)
    expect(ENDING_MS[mood]).toBe(Math.round((frames.length / 12) * 1000))
    // The laptop is gone before it jumps or says a thing.
    expect(gone > 0).toBe(true)
    expect(frames.slice(0, gone).every(frame => frame.hop === 0 && frame.say === 'none')).toBe(true)
    expectOnTrack(frames, false)
    // It plays on into the chase, each with its finish.
    expect(reel.intro).toEqual(polished(frames, false))
    expect(reel.loop).toEqual(polished(storyOf().frames, true))
    expect(source).toContain('animation:spark-settle')
    expect(source.length < SVG_LIMIT).toBe(true)
  }

  // Joy hops and shows a tick; a turn without an answer gets a "?".
  expect(endingOf('joy').some(frame => frame.hop > 0)).toBe(true)
  expect(endingOf('joy').some(frame => frame.say === 'done')).toBe(true)
  expect(bandOf('joy')).toContain(TICK)
  expect(endingOf('puzzled').some(frame => frame.say === 'ask')).toBe(true)
  expect(endingOf('closing').every(frame => frame.say === 'none' && frame.hop === 0)).toBe(true)
})

test("each turn's end is met, and then the chase comes back", async ($, on) => {
  const clock = mock.clock(on)

  // The engine beneath: a turn's start answers its id, its end the answer.
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const alt = async () => (await ui.find({ type: 'Svg' }))?.props.alt

  expect(await alt()).toBe(ALT.idle)

  for (const [reason, mood] of [
    ['answer', 'joy'],
    ['error', 'puzzled'],
    ['aborted', 'closing'],
  ] as const) {
    const turnId = `turn-${reason}`

    await $.turn.start({ text: 'go on', turnId })
    // The work shows from the turn's start, even before the band hears isWorking.
    expect(await alt()).toBe(ALT.working)

    await $.turn.complete({ answer: '', durationMs: 900, isAborted: reason === 'aborted', turnId, reason })
    expect(await alt()).toBe(ALT[mood])

    // The ending plays out, and a moment of the chase's still opening after it.
    await clock.advance(ENDING_MS[mood])
    expect(await alt()).toBe(ALT[mood])
    await clock.advance(1000)
    expect(await alt()).toBe(ALT.idle)
  }
  await ui.unmount()
})

test("a subagent's turns leave the band be, and an ending gives way to the next turn", async ($, on) => {
  const clock = mock.clock(on)

  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  const ui = await $.ui.mount({ ...BAND, surface: 'mobile' })
  const alt = async () => (await ui.find({ type: 'Svg' }))?.props.alt

  await $.turn.start({ text: 'look around', turnId: 'helper', agentId: 'agent-1' })
  expect(await alt()).toBe(ALT.idle)
  await $.turn.complete({
    answer: 'found it',
    durationMs: 400,
    isAborted: false,
    turnId: 'helper',
    agentId: 'agent-1',
    reason: 'answer',
  })
  expect(await alt()).toBe(ALT.idle)

  await $.turn.start({ text: 'one', turnId: 'one' })
  await $.turn.complete({ answer: 'done', durationMs: 500, isAborted: false, turnId: 'one', reason: 'answer' })
  expect(await alt()).toBe(ALT.joy)

  // The next turn starts while the cheer plays: the first turn's timer leaves it be.
  await $.turn.start({ text: 'two', turnId: 'two' })
  await clock.advance(ENDING_MS.joy + 1000)
  expect(await alt()).toBe(ALT.working)
  await ui.unmount()
})

test('the pointer stops the band to wave, and a press makes the character jump with a heart', () => {
  for (const mood of ['idle', 'working', 'joy'] as const) {
    const source = bandOf(mood)

    // Over the band, where a pointer hovers: everything holds, the eyes look out, and
    // an arm waves in place of the arms of the moment.
    expect(source).toContain('@media (hover: hover){svg:hover')
    expect(source).toContain('animation-play-state:paused')
    expect(source).toContain('class="gaze"')
    expect(source).toContain('class="wave-a"')
    // A press: up a few pixels with a heart and happy eyes, which stay a moment after.
    expect(source).toContain('svg:active .poke{transform:translateY(-8px)')
    expect(source).toContain('class="poke-heart"')
    expect(source).toContain('class="poke-face"')
  }
})

test('/winter calms the band and the snow, hides the band, and the next session remembers', async ($, on) => {
  mock.clock(on, { now: NOON })
  mock.store(on)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const backdrop = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
  const sourceOf = async (found: Promise<FoundElement | undefined>) => String((await found)?.props.source)
  const winter = (args: string) =>
    $.command.run({
      command: 'winter',
      args,
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 80 },
    })

  expect(await sourceOf(band.find({ type: 'Svg' }))).toContain('svg:hover')
  expect(await sourceOf(backdrop.find({ type: 'Svg' }))).not.toContain('/winter calm')

  // Calm: the still frame, no answer to the pointer, and the snow resting.
  expect((await winter('calm')).text).toContain('calm')
  expect(await sourceOf(band.find({ type: 'Svg' }))).toContain('animation:none!important')
  expect(await sourceOf(band.find({ type: 'Svg' }))).not.toContain('svg:hover')
  expect(await sourceOf(backdrop.find({ type: 'Svg' }))).toContain('/winter calm')

  // Off: no band at all, and the next session starts as this one was left.
  await winter('OFF ')
  expect(await band.find({ type: 'Svg' })).toBeUndefined()
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(await band.find({ type: 'Svg' })).toBeUndefined()
  expect((await winter('')).text).toContain('hidden')

  // On again; anything else is answered with how to use it.
  await winter('on')
  expect(await sourceOf(band.find({ type: 'Svg' }))).toContain('svg:hover')
  expect(await sourceOf(backdrop.find({ type: 'Svg' }))).not.toContain('/winter calm')
  expect((await winter('loud')).text).toContain('Usage')
  await band.unmount()
  await backdrop.unmount()
})

test('/winter focus sits the character still while the spark goes out, and rings a bell at the end', async ($, on) => {
  const clock = mock.clock(on, { now: NOON })
  const toasts: string[] = []

  mock.store(on)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const svg = async () => (await ui.find({ type: 'Svg' }))?.props
  const winter = (args: string) =>
    $.command.run({
      command: 'winter',
      args,
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 80 },
    })
  // Each ray's time to go out, and how far into the session the band was drawn.
  const rays = async () =>
    [
      ...String((await svg())?.source).matchAll(
        /class="ray-left" style="animation-duration:([\d.]+)s;animation-delay:-([\d.]+)s"/g,
      ),
    ].map(([, out, drawn]) => [Number(out), Number(drawn)] as const)

  // Twenty minutes: the character sits down, and the spark's eleven rays go out in
  // turn, the last as the time is up.
  expect((await winter('focus 20')).text).toContain('20 minutes')
  expect((await svg())?.alt).toBe(`${ALT.focus} of 20 minutes`)

  const fresh = await rays()

  expect(fresh.length).toBe(11)
  expect(Math.max(...fresh.map(([out]) => out))).toBe(1200)
  expect(Math.abs(Math.min(...fresh.map(([out]) => out)) - 1200 / 11) < 0.001).toBe(true)
  expect(fresh.every(([, drawn]) => drawn === 0)).toBe(true)
  expect((await winter('')).text).toContain('20 minutes left')

  // A turn in the middle shows the work; after it, the band comes back to the session
  // drawn for how far in it is by then.
  await clock.advance(8 * 60_000)
  await $.turn.start({ text: 'check the tests', turnId: 'mid' })
  expect(String((await svg())?.source)).not.toContain('ray-left')
  await $.turn.complete({ answer: 'ok', durationMs: 1000, isAborted: false, turnId: 'mid', reason: 'answer' })
  await clock.advance(ENDING_MS.joy + 1000)

  const later = await rays()

  expect(later.length).toBe(11)
  expect(later.every(([, drawn]) => Math.abs(drawn - (8 * 60 + ENDING_MS.joy / 1000 + 1)) < 0.01)).toBe(true)

  // The time up: a bell rings, a toast says so, and then the chase comes back.
  await clock.advance(12 * 60_000 - ENDING_MS.joy - 1000 - 1)
  expect((await svg())?.alt).toBe(`${ALT.focus} of 20 minutes`)
  await clock.advance(1)
  expect((await svg())?.alt).toBe(ALT.bell)
  expect(String((await svg())?.source)).toContain('class="bell"')
  expect(toasts.some(text => text.includes('focus time is up'))).toBe(true)
  await clock.advance(6000)
  expect((await svg())?.alt).toBe(ALT.idle)

  // Stopped early, it is over at once; with none under way, it says so; and a length
  // out of bounds is answered with how to use it.
  await winter('focus')
  expect((await svg())?.alt).toBe(`${ALT.focus} of 25 minutes`)
  expect((await winter('focus stop')).text).toContain('stopped')
  expect((await svg())?.alt).toBe(ALT.idle)
  expect((await winter('focus stop')).text).toContain('no focus')
  // Too few minutes or too many: how many a session runs; words it does not know: how to
  // use /winter.
  expect((await winter('focus 0')).text).toContain('from 1 to 180 minutes')
  expect((await winter('focus 181')).text).toContain('from 1 to 180 minutes')
  expect((await winter('focus 99999999999999999999')).text).toContain('from 1 to 180 minutes')
  expect((await winter('focus soon')).text).toContain('Usage')
  expect((await winter('focus -5')).text).toContain('Usage')

  // A reload in the middle keeps its time.
  await winter('focus 10')
  await clock.advance(4 * 60_000)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect((await svg())?.alt).toBe(`${ALT.focus} of 10 minutes`)
  await clock.advance(6 * 60_000)
  expect((await svg())?.alt).toBe(ALT.bell)
  await ui.unmount()
})

test('each system plays the sounds with a player of its own', () => {
  // Which system: a Windows path, or the kernel's name.
  expect(systemOf('C:\\Users\\me\\.claude\\plugins\\winter', undefined)).toBe('windows')
  expect(systemOf('C:/Users/me/.claude/plugins/winter', undefined)).toBe('windows')
  expect(systemOf('/Users/me/.claude/plugins/winter', 'Darwin\n')).toBe('mac')
  expect(systemOf('/home/me/.claude/plugins/winter', 'Linux\n')).toBe('linux')
  expect(systemOf('/home/me/.claude/plugins/winter', undefined)).toBe('linux')

  // The sound beside the plugin's own folder, in the path's own style.
  expect(fileOf('/home/me/winter', 'chime')).toBe('/home/me/winter/sounds/chime.wav')
  expect(fileOf('/home/me/winter/.claude-plugin/', 'bell')).toBe('/home/me/winter/sounds/bell.wav')
  expect(fileOf('C:\\Users\\me\\winter', 'pop')).toBe('C:\\Users\\me\\winter\\sounds\\pop.wav')

  // afplay on macOS. On Windows, .NET's SoundPlayer through PowerShell, the path in a
  // variable and never in the command, whatever characters it holds; then PowerShell by
  // where Windows keeps it, then PowerShell 7.
  expect(PLAYERS.mac.map(player => player.argv('/a b/chime.wav'))).toEqual([['afplay', '/a b/chime.wav']])

  const odd = "C:\\Users\\O'Neil $x\\أحمد\\pop.wav"

  for (const player of PLAYERS.windows) {
    const argv = player.argv(odd)

    expect(argv.slice(1)).toEqual(['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', PLAY_WAV])
    expect(argv.some(part => part.includes('pop.wav'))).toBe(false)
    expect(player.env?.(odd)).toEqual({ WINTER_SOUND: odd, WSLENV: 'WINTER_SOUND' })
  }
  expect(PLAYERS.windows.map(player => player.argv('')[0])).toEqual([
    'powershell.exe',
    'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    'pwsh.exe',
  ])
  expect(PLAY_WAV).toBe('try { (New-Object System.Media.SoundPlayer $env:WINTER_SOUND).PlaySync() } catch { exit 1 }')

  // On Linux, PipeWire's, PulseAudio's and ALSA's players first, then the media players,
  // and last, under WSL, Windows' own across the border.
  expect(PLAYERS.linux.map(player => player.name)).toEqual([
    'pw-play',
    'paplay',
    'aplay',
    'ffplay',
    'mpv',
    'gst-play-1.0',
    'cvlc',
    'play',
    'canberra-gtk-play',
    'PowerShell (WSL)',
    'PowerShell (WSL)',
  ])
  expect(PLAYERS.linux.filter(player => player.isAcrossWsl === true).length).toBe(2)
  expect(PLAYERS.linux[0]?.argv('/x.wav')).toEqual(['pw-play', '/x.wav'])

  // Every player at its own full volume: the sounds are made at the loudness they play at.
  for (const player of [...PLAYERS.mac, ...PLAYERS.windows, ...PLAYERS.linux]) {
    expect(player.argv('/x.wav').some(part => /volume|^-v$/.test(part))).toBe(false)
  }
})

// A machine for the sound tests: its kernel, its user's id, what wslpath answers, and
// which commands cannot start there. Every command run is kept, with its init.
function machine(
  on: Parameters<TestBody>[1],
  { kernel = 'Linux\n', windowsName = '', cannot = new Set<string>() } = {},
) {
  const calls: { argv: string[]; cwd?: string; env?: Record<string, string> }[] = []
  const LOOKS = new Set(['uname', 'id', 'wslpath'])

  on('process.run', (_, e) => {
    const [command = ''] = e.argv
    const done = { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }

    calls.push({ argv: [...e.argv], cwd: e.init?.cwd, env: e.init?.env })

    if (cannot.has(command)) {
      return { deny: `${command}: not found` }
    }
    if (command === 'uname') {
      return { value: { ...done, stdout: kernel } }
    }
    if (command === 'id') {
      return { value: { ...done, stdout: '1000\n' } }
    }
    if (command === 'wslpath') {
      return windowsName === '' ? { deny: 'wslpath: not found' } : { value: { ...done, stdout: `${windowsName}\n` } }
    }

    return { value: done }
  })

  return {
    calls,
    cannot,
    // The players run, by command, leaving out the looks around.
    players: () => calls.filter(call => !LOOKS.has(call.argv[0] ?? '')).map(call => call.argv[0]),
    files: () => calls.filter(call => !LOOKS.has(call.argv[0] ?? '')).map(call => call.argv[call.argv.length - 1] ?? ''),
  }
}

function soundTest(on: Parameters<TestBody>[1]) {
  const engine: string[] = []

  mock.store(on)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('tool.call', () => ({ result: 'done' }))
  on('ui.toast', () => ({ value: undefined }))
  on('audio.play', (_, e) => {
    engine.push(e.clip.asset ?? '')

    return { value: undefined }
  })

  return engine
}

test('/winter sound plays a chime for an answer, a bell for a focus done and a pop for git, with the player that runs', async ($, on) => {
  const clock = mock.clock(on, { now: NOON })
  const engine = soundTest(on)
  // Linux, where pw-play cannot start and paplay plays.
  const here = machine(on, { cannot: new Set(['pw-play']) })
  const winter = (args: string) =>
    $.command.run({
      command: 'winter',
      args,
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 80 },
    })
  const answer = async (turnId: string) => {
    await $.turn.start({ text: 'go', turnId })
    await $.turn.complete({ answer: 'ok', durationMs: 10, isAborted: false, turnId, reason: 'answer' })
    await clock.settle()
  }

  // Off until asked for.
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await answer('quiet')
  expect(here.calls).toEqual([])
  expect((await winter('')).text).toContain('sounds off')

  // On: a chime to say so, played by the first player that runs, which is kept.
  expect((await winter('sound on')).text).toContain('played with paplay')
  expect(here.players()).toEqual(['pw-play', 'paplay'])
  expect(here.files()[1]).toMatch(/[\\/]sounds[\\/]chime\.wav$/)
  await answer('loud')
  expect(here.players().slice(2)).toEqual(['paplay'])
  expect(here.files().at(-1)).toMatch(/chime\.wav$/)

  // Each run in the plugin's own folder, which is there whatever became of the session's.
  expect(here.calls.every(call => call.cwd !== undefined && call.cwd !== '' && call.cwd !== '/')).toBe(true)

  // A bell as a focus session ends; a pop for a commit.
  await winter('focus 1')
  await clock.advance(60_000)
  await clock.settle()
  expect(here.files().at(-1)).toMatch(/bell\.wav$/)
  await clock.advance(6000)
  await $.turn.start({ text: 'commit it', turnId: 'git' })
  await clock.advance(openingMsOf('plain'))
  await $.tool.call({ tool: 'Bash', command: 'git commit -m x', tool_use_id: 'c1' })
  await clock.settle()
  expect(here.files().at(-1)).toMatch(/pop\.wav$/)
  expect(engine).toEqual([])

  // Kept for the next session; off again, and quiet.
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect((await winter('')).text).toContain('sounds on')
  expect((await winter('sound off')).text).toContain('sounds off')

  const count = here.calls.length

  await answer('quiet again')
  expect(here.calls.length).toBe(count)
  expect((await winter('sound loud')).text).toContain('Usage')
})

test('with no player, the mod says what would play, waits, and looks again', async ($, on) => {
  const clock = mock.clock(on, { now: NOON })
  const engine = soundTest(on)
  const natives = PLAYERS.linux.filter(player => player.isAcrossWsl !== true).map(player => player.argv('')[0] ?? '')
  // Linux with none of its players, and no WSL under it.
  const here = machine(on, { cannot: new Set(natives) })
  const winter = (args: string) =>
    $.command.run({
      command: 'winter',
      args,
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 80 },
    })
  const answer = async (turnId: string) => {
    await $.turn.start({ text: 'go', turnId })
    await $.turn.complete({ answer: 'ok', durationMs: 10, isAborted: false, turnId, reason: 'answer' })
    await clock.settle()
  }

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  // Each is tried; Claude Code's own play is the last try; the answer says what would.
  expect((await winter('sound on')).text).toContain('no sound player answered')
  expect(here.players()).toEqual(natives)
  expect(here.calls.filter(call => call.argv[0] === 'wslpath').length).toBe(2)
  expect(engine).toEqual(['sounds/chime.wav'])

  // Not tried again for a while: an answer runs no player.
  const tried = here.calls.length

  await answer('soon after')
  expect(here.calls.length).toBe(tried)
  expect(engine.length).toBe(2)

  // Ten minutes on, the search is made again.
  await clock.advance(RETRY_AFTER_MS)
  await answer('later')
  expect(here.players().length).toBe(2 * natives.length)

  // ALSA's player installed meanwhile: /winter sound on looks again at once, and finds it.
  here.cannot.delete('aplay')
  expect((await winter('sound on')).text).toContain('played with aplay')
  await answer('with aplay')
  expect(here.players().at(-1)).toBe('aplay')
})

test("under WSL with no Linux player, Windows' own plays the sounds, by their Windows name", async ($, on) => {
  mock.clock(on, { now: NOON })
  soundTest(on)

  const natives = PLAYERS.linux.filter(player => player.isAcrossWsl !== true).map(player => player.argv('')[0] ?? '')
  const name = '\\\\wsl.localhost\\Ubuntu\\home\\me\\.claude\\plugins\\winter\\sounds\\chime.wav'
  const here = machine(on, { cannot: new Set(natives), windowsName: name })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const said = await $.command.run({
    command: 'winter',
    args: 'sound on',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  })
  const windows = here.calls.find(call => call.argv[0] === 'powershell.exe')

  expect(said.text).toContain('played with PowerShell (WSL)')
  expect(here.calls.find(call => call.argv[0] === 'wslpath')?.argv.slice(0, 2)).toEqual(['wslpath', '-w'])
  expect(windows?.argv).toEqual(['powershell.exe', '-NoLogo', '-NoProfile', '-NonInteractive', '-Command', PLAY_WAV])
  expect(windows?.env?.WINTER_SOUND).toBe(name)
  expect(windows?.env?.WSLENV).toBe('WINTER_SOUND')
})

test('started without its session, a Linux player is pointed at the sound server', async ($, on) => {
  const vars: Record<string, string | undefined> = {}

  mock.clock(on, { now: NOON })
  soundTest(on)
  on('env.get', (_, e) => ({ value: vars[e.name] }))

  const here = machine(on)
  const soundOn = () =>
    $.command.run({
      command: 'winter',
      args: 'sound on',
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 80 },
    })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  // No XDG_RUNTIME_DIR: the user's own, by their id.
  expect((await soundOn()).text).toContain('played with pw-play')
  expect(here.calls.find(call => call.argv[0] === 'pw-play')?.env).toEqual({ XDG_RUNTIME_DIR: '/run/user/1000' })

  // A desktop session's own: left as it is.
  vars.XDG_RUNTIME_DIR = '/run/user/1000'
  here.calls.length = 0
  await soundOn()
  expect(here.calls.map(call => call.argv[0])).toEqual(['uname', 'pw-play'])
  expect(here.calls.find(call => call.argv[0] === 'pw-play')?.env).toBeUndefined()
})

test('left alone a while, the band has a visitor, and the night sky its own', () => {
  const idle = bandOf('idle')

  // A penguin two minutes in, every four, sliding on the ice and trading snowballs with
  // the snowman; only in the chase, and never when the band is held still.
  expect(idle).toContain('class="peng-at"')
  expect(idle).toContain('animation:peng-at 240s linear infinite')
  expect(idle).toContain('class="px pball"')
  expect(idle).toContain('class="px sball"')
  expect(bandOf('idle', { calm: true })).not.toContain('class="peng-at"')
  expect(bandOf('working')).not.toContain('class="peng-at"')
  expect(bandOf('joy')).not.toContain('class="peng-at"')

  // The penguin's way follows the stage's width as the character's does: no keyframe
  // holds the width.
  const keyframes = idle.match(/@keyframes (?:peng|pball|sball)[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g) ?? []

  expect(keyframes.length >= 5).toBe(true)
  expect(keyframes.filter(block => block.includes('var(--w)') || /\d+vw/.test(block))).toEqual([])

  // Shooting stars and the northern lights, on a clear night only.
  const night = sceneOf({ sky: 'night' })

  expect(night.match(/class="shoot"/g)?.length).toBe(2)
  expect(night).toContain('class="aurora"')
  expect(sceneOf({ sky: 'day' })).not.toContain('class="aurora"')
  expect(sceneOf({ sky: 'night', calm: true })).not.toContain('class="shoot"')
})

test('the clock gives the sky, the occasion and how late it is', () => {
  const at = (year: number, month: number, day: number, hour: number, minute = 0) =>
    whenOf(new Date(year, month, day, hour, minute).getTime())

  expect(at(2026, 10, 17, 12)).toEqual({ sky: 'day', occasion: 'none', isLate: false })
  expect(at(2026, 10, 17, 6, 30)).toEqual({ sky: 'dawn', occasion: 'none', isLate: false })
  expect(at(2026, 10, 17, 18)).toEqual({ sky: 'dusk', occasion: 'none', isLate: false })
  expect(at(2026, 10, 17, 23)).toEqual({ sky: 'night', occasion: 'none', isLate: false })
  // New Year's eve, and the small hours of its day.
  expect(at(2026, 11, 31, 22)).toEqual({ sky: 'night', occasion: 'newyear', isLate: false })
  expect(at(2027, 0, 1, 2)).toEqual({ sky: 'night', occasion: 'newyear', isLate: true })
  // 13 Ramadan 1448, by the Umm al-Qura calendar.
  expect(at(2027, 1, 20, 1, 30)).toEqual({ sky: 'night', occasion: 'ramadan', isLate: true })
})

test("asleep, it sits in the snow while the z's come and go", () => {
  const { intro, loop, poster } = sleepingOf()

  // A yawn from home, then down on the snow, eyes shut, for the whole loop.
  expect(intro[0]).toMatchObject({ x: HOME.x, crouch: false })
  expect(loop.every(frame => frame.crouch && frame.legs === 'tuck' && frame.eyes === 'shut')).toBe(true)
  expect(['z1', 'z2', 'z3'].every(z => loop.some(frame => frame.say === z))).toBe(true)
  expect(poster.say).toBe('z2')
  expectOnTrack(intro, false)
  expectOnTrack(loop, true)

  const source = bandOf('sleep')

  // No chase while it sleeps: no footprints, and the spark rests, unlit.
  expect(source).not.toContain('class="print"')
  expect(source).not.toContain('animation:spark-x')
  expect(source).not.toContain('class="glow"')
  expect(source.length < SVG_LIMIT).toBe(true)
})

test('late at night with nothing to do it dozes off, work wakes it, and by day it stays awake', async ($, on) => {
  const clock = mock.clock(on, { now: new Date(2026, 10, 18, 1, 0).getTime() })

  mock.store(on)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const alt = async () => (await band.find({ type: 'Svg' }))?.props.alt

  expect(await alt()).toBe(ALT.idle)
  await clock.advance(3 * 60_000)
  expect(await alt()).toBe(ALT.sleep)

  // Work wakes it, and once things are quiet again it dozes off again.
  await $.turn.start({ text: 'one more thing', turnId: 'late' })
  expect(await alt()).toBe(ALT.working)
  await $.turn.complete({ answer: 'done', durationMs: 500, isAborted: false, turnId: 'late', reason: 'answer' })
  await clock.advance(ENDING_MS.joy + 1000)
  expect(await alt()).toBe(ALT.idle)
  await clock.advance(3 * 60_000)
  expect(await alt()).toBe(ALT.sleep)

  // Morning: five o'clock wakes it, with nothing asked of it.
  await clock.set(new Date(2026, 10, 18, 5, 1).getTime())
  expect(await alt()).toBe(ALT.idle)
  await clock.advance(30 * 60_000)
  expect(await alt()).toBe(ALT.idle)
  await band.unmount()
})

test('it dresses for New Year and for Ramadan, and the sky follows the clock', async ($, on) => {
  const newYear = bandOf('idle', { occasion: 'newyear' })
  const ramadan = bandOf('working', { occasion: 'ramadan' })

  // A party hat in place of the knitted one, and confetti.
  expect(newYear).toContain(PARTY_PURPLE)
  expect(newYear).toContain('class="confetti"')
  expect(newYear).not.toContain(KNIT_PINK)
  // A lantern hung over the track, halfway along it.
  expect(ramadan).toContain(LANTERN_GOLD)
  expect(ramadan).toContain('class="lantern-lit"')
  expect(ramadan).toContain('.lantern{transform:translateX(round(nearest,calc(0.5 * var(--w)),2px))}')
  for (const occasion of ['none', 'newyear', 'ramadan'] as const) {
    for (const mood of ['idle', 'working', 'joy', 'sleep'] as const) {
      expect(bandOf(mood, { occasion }).length < SVG_LIMIT).toBe(true)
    }
  }

  // Moon and stars at night, a low sun at dawn and dusk, a plain day; in Ramadan the
  // crescent, bright at night and faint by day.
  expect(sceneOf({ sky: 'night' })).toContain('class="star"')
  expect(sceneOf({ sky: 'night' })).toContain('fill="#f2e6b6"')
  expect(sceneOf({ sky: 'dawn' })).toContain('fill="url(#dawn)"')
  expect(sceneOf({ sky: 'dusk' })).toContain('fill="url(#dusk)"')
  expect(sceneOf({ sky: 'day' })).not.toContain('class="star"')
  expect(sceneOf({ sky: 'day' })).not.toContain('fill="url(#sun)"')
  expect(sceneOf({ sky: 'night', occasion: 'ramadan' })).toContain('fill="#e9c96b" fill-opacity="1"')
  expect(sceneOf({ sky: 'day', occasion: 'ramadan' })).toContain('fill="#e9c96b" fill-opacity="0.5"')

  // Through the hooks, on a Ramadan night.
  mock.clock(on, { now: new Date(2027, 1, 20, 21, 0).getTime() })
  mock.store(on)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const backdrop = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })

  expect(String((await band.find({ type: 'Svg' }))?.props.source)).toContain(LANTERN_GOLD)
  expect(String((await backdrop.find({ type: 'Svg' }))?.props.source)).toContain('class="star"')
  await band.unmount()
  await backdrop.unmount()
})

test('each kind of tool has an act of its own, with its own prop', () => {
  expect(['Read', 'Grep', 'Glob'].map(activityOf)).toEqual(['read', 'read', 'read'])
  expect(['Edit', 'Write', 'NotebookEdit'].map(activityOf)).toEqual(['edit', 'edit', 'edit'])
  expect(['Bash', 'BashOutput'].map(activityOf)).toEqual(['run', 'run'])
  expect(['WebSearch', 'WebFetch', 'mcp__Claude_Browser__navigate'].map(activityOf)).toEqual(['web', 'web', 'web'])
  expect(['TodoWrite', 'Agent', 'mcp__docs__read'].map(activityOf)).toEqual(['think', 'think', 'think'])

  for (const activity of ['think', 'edit', 'read', 'run', 'web', 'wait'] as const) {
    for (const opening of ['start', 'switch'] as const) {
      const { intro, loop } = workingOf({ activity, opening, tone: 'none' })

      // A turn's first band says "!"; a switch of tools opens with a puff.
      expect(intro[0]?.say === 'alert' || opening === 'switch').toBe(true)
      expect(intro[0]?.laptop === 'poof' || opening === 'start').toBe(true)
      // All of it at home, on the ground.
      expect(loop.every(frame => isAt(frame.x, HOME.x) && frame.hop === 0)).toBe(true)
      expectOnTrack(intro, false)
      expectOnTrack(loop, true)
      expect(bandOf('working', { work: { activity, opening, helpers: 3, tone: 'urgent', heat: 0, trek: 0 } }).length < SVG_LIMIT).toBe(true)
    }
  }

  const loopOf = (activity: Activity) => workingOf({ activity, opening: 'switch', tone: 'plain' }).loop

  // Reading: the book open all along, a page turned now and then.
  expect(loopOf('read').every(frame => frame.book !== 'none')).toBe(true)
  expect(loopOf('read').some(frame => frame.book === 'turn')).toBe(true)
  // Running: the terminal box all along, its screen scrolling through three lines.
  expect(loopOf('run').every(frame => frame.box !== 'none' && frame.screen !== 'none')).toBe(true)
  expect(new Set(loopOf('run').map(frame => frame.screen)).size).toBe(3)
  // Searching: the binoculars up nearly all along, turned every way.
  expect(loopOf('web').filter(frame => frame.scope !== 'none').length > loopOf('web').length * 0.8).toBe(true)
  expect(new Set(loopOf('web').map(frame => frame.scope))).toEqual(new Set(['left', 'ahead', 'right', 'none']))
  // Editing: typing at the open laptop as code flies off it.
  expect(loopOf('edit').every(frame => frame.laptop === 'open')).toBe(true)
  expect(loopOf('edit').some(frame => frame.glyph === 'g3')).toBe(true)
  // Waiting: the laptop shut, a hand up and waving, "?" over its head.
  expect(
    loopOf('wait').every(
      frame => frame.laptop === 'closed' && frame.say === 'ask' && (frame.arms === 'hand' || frame.arms === 'hand2'),
    ),
  ).toBe(true)
  expect(loopOf('think').every(frame => frame.laptop === 'open')).toBe(true)

  // The spark whirls fastest as code flies to it, and holds still while a question waits.
  expect(bandOf('working', { work: { activity: 'edit', opening: 'switch', helpers: 0, tone: 'plain', heat: 0, trek: 0 } })).toContain(
    'animation:spark-whirl 1.6s linear infinite',
  )
  expect(bandOf('working', { work: { activity: 'wait', opening: 'switch', helpers: 0, tone: 'plain', heat: 0, trek: 0 } })).not.toContain(
    'spark-whirl',
  )

  // The helpers pace at the far end, clear of the snowman and on the stage, at any width.
  for (const width of WIDTHS) {
    for (let index = 0; index < MAX_HELPERS; index++) {
      const left = pixelsOf(helperAt(index), width)

      expect(left > pixelsOf(TRACK.greet, width)).toBe(true)
      expect(left + HELPER_SPAN <= width).toBe(true)
    }
  }
})

test('the band acts out the tool that runs, each a moment at least, and a question raises its hand', async ($, on) => {
  const clock = mock.clock(on, { now: NOON })
  const gates: (() => void)[] = []

  // The engine beneath: a turn's ids, and tools that run until the test lets them end.
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('tool.call', () => new Promise(done => gates.push(() => done({ result: 'done' }))))
  on('classic.PermissionRequest', () => ({}))
  on('classic.PermissionDenied', () => ({}))

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, isWorking: true }, surface: 'desktop' })
  const alt = async () => (await ui.find({ type: 'Svg' }))?.props.alt
  const end = async (run: Promise<unknown>) => {
    gates.shift()?.()
    await run
  }

  await $.turn.start({ text: 'look into it', turnId: 'work' })
  expect(await alt()).toBe(WORK_ALT.think)

  // A file read, once the turn's opening has played: the prompt's plane caught and read.
  const reading = $.tool.call({ tool: 'Read', file_path: '/notes.md', tool_use_id: 'read-1' })

  expect(await alt()).toBe(WORK_ALT.think)
  await clock.advance(openingMsOf('plain') - 1)
  expect(await alt()).toBe(WORK_ALT.think)
  await clock.advance(1)
  expect(await alt()).toBe(WORK_ALT.read)

  // A quick edit right after: the book stays its moment, then the laptop and the code.
  await end(reading)
  const editing = $.tool.call({ tool: 'Edit', file_path: '/notes.md', old_string: 'a', new_string: 'b', tool_use_id: 'edit-1' })

  expect(await alt()).toBe(WORK_ALT.read)
  await clock.advance(1500)
  expect(await alt()).toBe(WORK_ALT.edit)
  await end(editing)

  // A command that has to ask first: the lever, then the hand up for the question,
  // and back to the laptop once it has run.
  const running = $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'run-1' })

  await clock.advance(1500)
  expect(await alt()).toBe(WORK_ALT.run)
  await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'ls' } })
  await clock.advance(1500)
  expect(await alt()).toBe(WORK_ALT.wait)
  await end(running)
  await clock.advance(1500)
  expect(await alt()).toBe(WORK_ALT.think)

  // A refusal lowers the hand too.
  const refused = $.tool.call({ tool: 'Write', file_path: '/x', content: 'y', tool_use_id: 'write-1' })

  await $.classic.PermissionRequest({ tool_name: 'Write', tool_input: {} })
  await clock.advance(1500)
  expect(await alt()).toBe(WORK_ALT.wait)
  await $.classic.PermissionDenied({ tool_name: 'Write', tool_input: {}, tool_use_id: 'write-1', reason: 'no' })
  await clock.advance(1500)
  expect(await alt()).toBe(WORK_ALT.edit)
  await end(refused)

  // A subagent's own tools leave the main band be.
  const helping = $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'agent-run', agentId: 'agent-9' })

  await clock.advance(3000)
  expect(await alt()).toBe(WORK_ALT.think)
  await end(helping)
  await ui.unmount()
})

test('helpers come out with the agents Claude sends, and go back as each one ends', async ($, on) => {
  const clock = mock.clock(on, { now: NOON })
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, isWorking: true }, surface: 'desktop' })
  const svg = async () => (await ui.find({ type: 'Svg' }))?.props
  const helpersDrawn = async () => (String((await svg())?.source).match(/class="helper"/g) ?? []).length

  await $.turn.start({ text: 'split the work', turnId: 'main' })
  expect(await helpersDrawn()).toBe(0)

  // Sent off while the prompt's plane is still being read: they come out once it has
  // been, so nothing cuts the opening short.
  for (const agentId of ['scout', 'reader']) {
    await $.turn.start({ text: 'go', turnId: `${agentId}-turn`, agentId })
  }
  expect(await helpersDrawn()).toBe(0)
  await clock.advance(openingMsOf('plain'))
  expect(await helpersDrawn()).toBe(2)
  expect((await svg())?.alt).toBe(`${WORK_ALT.think}, with 2 little helpers carrying parcels`)
  // A helper coming out is no new kind of work: the laptop stays out, with no puff.
  expect(String((await svg())?.source)).not.toContain('lid-poof')

  await $.turn.complete({
    answer: 'found it',
    durationMs: 300,
    isAborted: false,
    turnId: 'scout-turn',
    agentId: 'scout',
    reason: 'answer',
  })
  // Each change stays its moment, so helpers coming and going never flicker.
  expect(await helpersDrawn()).toBe(2)
  await clock.advance(1500)
  expect(await helpersDrawn()).toBe(1)

  // No more than three at once, however many go out.
  for (const agentId of ['a', 'b', 'c', 'd']) {
    await $.turn.start({ text: 'go', turnId: `${agentId}-turn`, agentId })
  }
  await clock.advance(1500)
  expect(await helpersDrawn()).toBe(3)
  await ui.unmount()
})

test('a prompt is read for thanks, a hurry or a question, in English and in Arabic', () => {
  expect(toneOf('')).toBe('none')
  expect(toneOf('  \n ')).toBe('none')
  expect(toneOf('<command-name>/review</command-name>')).toBe('plain')
  expect(toneOf('fix the login page')).toBe('plain')
  expect(toneOf('لم يمتد')).toBe('plain')
  expect(toneOf('Write a great README for the project')).toBe('plain')
  expect(toneOf('/winter calm')).toBe('plain')
  // Thanks, or praise as a whole prompt; thanks anywhere in a longer one.
  expect(toneOf('Thanks!')).toBe('thanks')
  expect(toneOf('great job')).toBe('thanks')
  expect(toneOf('شكراً جزيلاً!')).toBe('thanks')
  expect(toneOf('ممتاز جداً')).toBe('thanks')
  expect(toneOf('يعطيك العافية')).toBe('thanks')
  expect(toneOf('Write the README for the project, thank you')).toBe('thanks')
  // A question, by its mark or by how it opens.
  expect(toneOf('why does the build fail')).toBe('question')
  expect(toneOf('كيف أثبت المود')).toBe('question')
  expect(toneOf('ممتاز جدا جدا ، هل من افكار اخرى ؟')).toBe('question')
  expect(toneOf('is this right? :)')).toBe('question')
  // A hurry, before all.
  expect(toneOf('قم بها حالاً')).toBe('urgent')
  expect(toneOf('عاجل: الخادم متوقف؟')).toBe('urgent')
  expect(toneOf('please fix this ASAP, thanks')).toBe('urgent')
})

test('a prompt comes up as a paper plane, and the character meets it by how it sounds', () => {
  const opened: Partial<Record<Tone, number>> = {}

  for (const tone of ['none', 'plain', 'thanks', 'urgent', 'question'] as const) {
    const { intro, loop } = workingOf({ activity: 'think', opening: 'start', tone })
    const flight = intro.filter(frame => frame.plane !== null)
    const [first] = flight
    const last = flight[flight.length - 1]

    expectOnTrack(intro, false)
    expectOnTrack(loop, true)
    opened[tone] = openingMsOf(tone)
    expect(openingMsOf(tone)).toBe(Math.round((intro.length / 12 / (tone === 'urgent' ? 1.5 : 1)) * 1000))
    // The plane and its note are gone by the time the work is under way.
    expect(loop.every(frame => frame.plane === null && !frame.note)).toBe(true)

    if (tone === 'none') {
      // Nothing typed: no plane, just "!".
      expect(flight).toEqual([])
      expect(intro[0]?.say).toBe('alert')
      continue
    }
    // Up out of the prompt box under the band, over the spark, and down onto the hands.
    expect(intro.indexOf(first ?? HOME)).toBe(0)
    expect((first?.plane?.y ?? 0) + 3 * UNIT > BAND_HEIGHT).toBe(true)
    expect(
      flight.every(frame => (frame.plane?.x ?? 0) < 40 || (frame.plane?.x ?? 0) > 64 || (frame.plane?.y ?? 99) + 3 * UNIT <= 16),
    ).toBe(true)
    expect(last?.arms).toBe('up')
    expect((last?.plane?.x ?? 99) < HOME.x.px + SPRITE_WIDTH).toBe(true)
    // Unfolded and read.
    const reading = intro.filter(frame => frame.note)

    expect(reading.length > 0 && reading.every(frame => frame.eyes === 'down' && frame.arms === 'hold')).toBe(true)

    // Met by how it sounds.
    const met = intro.slice(intro.lastIndexOf(reading[reading.length - 1] ?? HOME) + 1)

    if (tone === 'thanks') {
      expect(met.some(frame => frame.blush && frame.eyes === 'happy' && frame.say === 'love')).toBe(true)
      // A dance from side to side, its feet on the ground.
      expect(new Set(met.map(frame => pixelsOf(frame.x, REFERENCE_WIDTH))).size).toBe(3)
      expect(met.some(frame => frame.say === 'alert')).toBe(false)
    } else if (tone === 'question') {
      expect(met.some(frame => frame.arms === 'scratch1' && frame.say === 'ask')).toBe(true)
      expect(met.some(frame => frame.arms === 'scratch2')).toBe(true)
      expect(met.findIndex(frame => frame.say === 'alert') > met.findIndex(frame => frame.say === 'ask')).toBe(true)
    } else if (tone === 'urgent') {
      expect(met.some(frame => frame.say === 'alert' && frame.sweat !== 'none')).toBe(true)
      // The sweat keeps coming while it works.
      expect(loop.filter(frame => frame.sweat !== 'none').length >= 3).toBe(true)
    } else {
      expect(met[0]?.say).toBe('alert')
    }
    if (tone !== 'urgent') {
      expect(loop.every(frame => frame.sweat === 'none' && !frame.blush)).toBe(true)
    }
  }

  // The longer the welcome, the longer the opening; a hurry is quickest of the typed.
  expect((opened.none ?? 0) < (opened.urgent ?? 0)).toBe(true)
  expect((opened.urgent ?? 0) < (opened.plain ?? 0)).toBe(true)
  expect((opened.plain ?? 0) < (opened.thanks ?? 0)).toBe(true)

  // In a hurry the band runs faster, and the spark whirls faster too.
  const hurried = bandOf('working', { work: { activity: 'edit', opening: 'switch', helpers: 0, tone: 'urgent', heat: 0, trek: 0 } })
  const { loop } = workingOf({ activity: 'edit', opening: 'switch', tone: 'urgent' })

  expect(hurried).toContain(`,${Number((loop.length / 12 / 1.5).toFixed(3))}s;`)
  expect(hurried).toContain('animation:spark-whirl 1.067s linear infinite')
  expect(hurried).toContain(SWEAT_BLUE)
})

test('a quick tool waits for the plane to be read, and a hurry shows all through the turn', async ($, on) => {
  const clock = mock.clock(on, { now: NOON })
  const gates: (() => void)[] = []

  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('tool.call', () => new Promise(done => gates.push(() => done({ result: 'done' }))))

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, isWorking: true }, surface: 'desktop' })
  const svg = async () => (await ui.find({ type: 'Svg' }))?.props
  const end = async (run: Promise<unknown>) => {
    gates.shift()?.()
    await run
  }

  // Thanks: the dance plays whole before the book comes out.
  await $.turn.start({ text: 'شكراً جزيلاً', turnId: 'thanks' })
  expect(String((await svg())?.source)).toContain(BLUSH_PINK)

  const reading = $.tool.call({ tool: 'Read', file_path: '/notes.md', tool_use_id: 'read-1' })

  await clock.advance(1500)
  expect((await svg())?.alt).toBe(WORK_ALT.think)
  await clock.advance(openingMsOf('thanks') - 1500)
  expect((await svg())?.alt).toBe(WORK_ALT.read)
  await end(reading)
  await $.turn.complete({ answer: 'ok', durationMs: 900, isAborted: false, turnId: 'thanks', reason: 'answer' })

  // A hurry: said in words, and kept through a switch of tools.
  await $.turn.start({ text: 'عاجل! الخادم متوقف', turnId: 'hurry' })
  expect((await svg())?.alt).toBe(`${WORK_ALT.think}, in a hurry`)

  const running = $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'run-1' })

  // The opening, or each act's least moment if that is longer.
  await clock.advance(Math.max(1500, openingMsOf('urgent')))
  expect((await svg())?.alt).toBe(`${WORK_ALT.run}, in a hurry`)
  expect(String((await svg())?.source)).toContain(SWEAT_BLUE)
  await end(running)
  await ui.unmount()
})

test('the longer and harder a turn works, the hotter the spark, and a hard answer ends in fireworks', () => {
  // By time or by tools, whichever comes first.
  expect(heatOf(0, 0)).toBe(0)
  expect(heatOf(19_999, 4)).toBe(0)
  expect(heatOf(20_000, 0)).toBe(1)
  expect(heatOf(0, 5)).toBe(1)
  expect(heatOf(60_000, 2)).toBe(2)
  expect(heatOf(1000, 15)).toBe(2)
  expect(heatOf(180_000, 0)).toBe(3)
  expect(heatOf(0, 40)).toBe(3)

  const hot = (heat: 0 | 1 | 2 | 3) =>
    bandOf('working', { work: { activity: 'edit', opening: 'stay', helpers: 0, tone: 'plain', heat, trek: 0 } })

  // Faster, brighter, bigger; embers at the top two heats.
  expect(hot(0)).toContain('animation:spark-whirl 1.6s linear infinite')
  expect(hot(3)).toContain('animation:spark-whirl 0.88s linear infinite')
  expect(hot(0)).toContain('<circle class="glow" r="13"')
  expect(hot(3)).toContain('<circle class="glow" r="19"')
  expect(hot(1).match(/class="rise"/g)).toBeNull()
  expect(hot(2).match(/class="rise"/g)?.length).toBe(3)
  expect(hot(3).match(/class="rise"/g)?.length).toBe(6)

  // The same work, only harder, goes on with no opening.
  const { intro, loop } = workingOf({ activity: 'read', opening: 'stay', tone: 'plain' })

  expect(intro).toEqual([])
  expect(loop[0]?.book).not.toBe('none')

  // Three rockets, each bursting into eight sparks, done within the joy's own time.
  const grand = bandOf('joy', { grand: true })

  expect(grand.match(/class="rocket"/g)?.length).toBe(3)
  expect(grand.match(/class="firework"/g)?.length).toBe(24)
  expect(1.05 + 0.3 + 0.8 < ENDING_MS.joy / 1000).toBe(true)
  expect(bandOf('joy')).not.toContain('class="rocket"')
  expect(bandOf('puzzled', { grand: true })).not.toContain('class="rocket"')
})

test('a long turn heats the spark up, and its answer sends up fireworks', async ($, on) => {
  const clock = mock.clock(on, { now: NOON })

  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, isWorking: true }, surface: 'desktop' })
  const svg = async () => (await ui.find({ type: 'Svg' }))?.props

  await $.turn.start({ text: 'refactor the whole thing', turnId: 'long' })
  expect(String((await svg())?.source)).not.toContain('class="rise"')
  await clock.advance(60_000)
  expect((await svg())?.alt).toBe(`${WORK_ALT.think}, hard at it for a while now, 1 minute into the turn, a flag on the snow for each`)
  expect(String((await svg())?.source)).toContain('class="rise"')

  await ui.unmount()

  const after = await $.ui.mount({ ...BAND, surface: 'desktop' })

  await $.turn.complete({ answer: 'done', durationMs: 61_000, isAborted: false, turnId: 'long', reason: 'answer' })
  expect(String((await after.find({ type: 'Svg' }))?.props.source)).toContain('class="rocket"')

  // A quick turn's answer has none.
  await $.turn.start({ text: 'and the docs', turnId: 'quick' })
  await clock.advance(3000)
  await $.turn.complete({ answer: 'done', durationMs: 3000, isAborted: false, turnId: 'quick', reason: 'answer' })
  expect(String((await after.find({ type: 'Svg' }))?.props.source)).not.toContain('class="rocket"')
  await after.unmount()
})

test('git commits and pushes are told apart from everything else a shell runs', () => {
  expect(cheerOf('git commit -m "fix the band"')).toBe('commit')
  expect(cheerOf('git commit -n -m "skip the hooks"')).toBe('commit')
  expect(cheerOf('GIT_AUTHOR_NAME=me git commit -m x')).toBe('commit')
  expect(cheerOf('git -C /repo push origin main')).toBe('push')
  expect(cheerOf('git status; git push')).toBe('push')
  expect(cheerOf("git add -A && git commit -q -F - <<'EOF'\nThe band\nEOF\ngit push -q origin main")).toBe('ship')
  expect(cheerOf('git push --dry-run')).toBeUndefined()
  expect(cheerOf('git push -n origin main')).toBeUndefined()
  expect(cheerOf('git log --grep commit')).toBeUndefined()
  expect(cheerOf('echo "git commit"')).toBeUndefined()
  expect(cheerOf('npm test')).toBeUndefined()

  // A flag waved high for a commit; a snowball thrown up out of the band for a push,
  // and a star where it went; one after the other for both. Then the prop comes back.
  const commit = workingOf({ activity: 'run', opening: 'commit', tone: 'plain' }).intro
  const push = workingOf({ activity: 'run', opening: 'push', tone: 'plain' }).intro
  const ship = workingOf({ activity: 'run', opening: 'ship', tone: 'plain' }).intro

  expect(commit.filter(frame => frame.gitFlag !== 'none').every(frame => frame.arms === 'up')).toBe(true)
  expect(new Set(commit.map(frame => frame.gitFlag))).toEqual(new Set(['none', 'wave1', 'wave2']))
  expect(push.some(frame => (frame.snowball?.y ?? 99) + 2 * UNIT < 0)).toBe(true)
  expect(push.some(frame => frame.twinkle === 'big')).toBe(true)
  // Both share one puff (two frames) and one terminal coming out (two frames).
  expect(ship.length).toBe(commit.length + push.length - 4)
  expect(commit[commit.length - 1]?.box).toBe('up')

  for (const intro of [commit, push, ship]) {
    expectOnTrack(intro, false)
  }
})

test('the band cheers a commit and a push that went through, and not one that failed', async ($, on) => {
  const clock = mock.clock(on, { now: NOON })
  const answers: ({ result: string; isError: true } | { result: string })[] = []

  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('tool.call', () => answers.shift() ?? { result: 'done' })

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, isWorking: true }, surface: 'desktop' })
  const source = async () => String((await ui.find({ type: 'Svg' }))?.props.source)

  await $.turn.start({ text: 'ship it', turnId: 'git' })
  await clock.advance(openingMsOf('plain'))

  // Nothing to commit: no flag.
  answers.push({ result: 'nothing to commit, working tree clean', isError: true })
  await $.tool.call({ tool: 'Bash', command: 'git commit -m x', tool_use_id: 'c0' })
  await clock.advance(1500)
  expect(await source()).not.toContain('git-flag-wave1')

  // A commit: the flag.
  await $.tool.call({ tool: 'Bash', command: 'git commit -m x', tool_use_id: 'c1' })
  await clock.advance(1500)
  expect(await source()).toContain('git-flag-wave1')

  // An agent's push: the snowball, once the flag has been waved through.
  await $.tool.call({ tool: 'Bash', command: 'git push origin main', tool_use_id: 'p1', agentId: 'shipper' })
  await clock.advance(1500)
  expect(await source()).not.toContain('class="m ball-at px"')
  await clock.advance(introMsOf({ activity: 'run', opening: 'commit', tone: 'plain' }))
  expect(await source()).toContain('class="m ball-at px"')
  await ui.unmount()
})

test("a long turn's camp moves on a step a minute, a flag behind it, never onto the snowman", () => {
  expect([0, 59_999, 60_000, 150_000, 600_000, 900_000].map(trekOf)).toEqual([0, 0, 1, 2, 10, 10])
  expect(campAt(0)).toEqual(HOME.x)

  for (const width of WIDTHS) {
    const camps = Array.from({ length: MAX_TREK + 1 }, (_, minute) => pixelsOf(campAt(minute), width))
    const snowman = pixelsOf(TRACK.snowman, width)

    // Onward all the way, on the stage.
    expect(camps.every((x, minute) => minute === 0 || x >= (camps[minute - 1] ?? 0))).toBe(true)
    expect(camps.every(x => x >= 0 && x + CAMP_WIDTH <= width)).toBe(true)
    // Never on the snowman, its broom or its arm; nor its flag, past it.
    camps.forEach((x, minute) => {
      expect(x + CAMP_WIDTH <= snowman - SNOWMAN_REACH.left || x >= snowman + SNOWMAN_REACH.right).toBe(true)
      expect(Math.abs(pixelsOf(flagAt(minute), width) - (x - FLAG_BEHIND)) < 1e-6).toBe(true)

      if (x > snowman) {
        expect(x - FLAG_BEHIND >= snowman + SNOWMAN_REACH.right).toBe(true)
      }
    })

    // Wide enough, short of where the helpers work.
    if (width >= REFERENCE_WIDTH) {
      expect((camps[MAX_TREK] ?? 0) + CAMP_WIDTH <= pixelsOf(helperAt(MAX_HELPERS - 1), width)).toBe(true)
    }
  }

  // Each minute: the prop goes, a walk on to the next station with the spark beside it,
  // and the flag pushed in behind. Past the snowman, a wave, which it returns.
  for (let trek = 1; trek <= MAX_TREK; trek++) {
    const { intro, loop, plantAt } = workingOf({ activity: 'read', opening: 'onward', tone: 'plain', trek })
    const crosses =
      pixelsOf(campAt(trek - 1), REFERENCE_WIDTH) < pixelsOf(TRACK.snowman, REFERENCE_WIDTH) &&
      pixelsOf(campAt(trek), REFERENCE_WIDTH) > pixelsOf(TRACK.snowman, REFERENCE_WIDTH)

    expect(isAt(intro[0]?.x ?? HOME.x, campAt(trek - 1))).toBe(true)
    expect(isAt(intro[intro.length - 1]?.x ?? HOME.x, campAt(trek))).toBe(true)
    expect(loop.every(frame => isAt(frame.x, campAt(trek)))).toBe(true)
    expect(plantAt === undefined ? undefined : intro[plantAt]?.crouch).toBe(true)
    expect(intro.slice(plantAt).every(frame => isAt(frame.x, campAt(trek)))).toBe(true)
    expect(intro.some(frame => frame.pal === 'wave')).toBe(crosses)
    expect(intro.at(-1)?.book).not.toBe('none')
    expectOnTrack(intro, false)
  }

  const pennant = `d="${pathOf(TREK_FLAG.flag)}"`
  const flagsIn = (band: string) => band.split(pennant).length - 1
  const working = (opening: 'stay' | 'switch' | 'onward', trek: number) =>
    bandOf('working', { work: { activity: 'think', opening, helpers: 0, tone: 'plain', heat: 0, trek } })
  const { plantAt } = workingOf({ activity: 'think', opening: 'onward', tone: 'plain', trek: 3 })

  // Three minutes, three flags. The newest goes in as the camp reaches it, the spark
  // rolling along beside; going on with the same work, or switching, nothing moves.
  expect(flagsIn(working('onward', 3))).toBe(3)
  expect(working('onward', 3)).toContain(
    `class="plant" style="animation-delay:${Number(((plantAt ?? 0) / 12).toFixed(3))}s"`,
  )
  expect(working('onward', 3)).toContain('animation:spark-follow')
  expect(working('switch', 3)).not.toContain('class="plant"')
  expect(working('stay', 3)).not.toContain('spark-follow')
  expect(flagsIn(working('stay', 0))).toBe(0)

  // At the camp: the spark beside the character, and the robin and the git cheers there.
  expect(working('stay', 6)).toContain(
    `.spark-x{--of:${Number(campAt(6).of.toFixed(5))};--px:${Number((campAt(6).px + 38).toFixed(2))}px;`,
  )
  expect(working('stay', 6)).toContain(
    `.camp{--of:${Number(campAt(6).of.toFixed(5))};--px:${Number((campAt(6).px - HOME.x.px).toFixed(2))}px;`,
  )

  // A long turn answered: the big flag where the last stood, flying. Not for a short
  // one, nor for one that ended any other way.
  const summit = bandOf('joy', { trek: 3 })

  expect(flagsIn(summit)).toBe(2)
  expect(summit).toContain('class="fly1"')
  expect(summit).toContain('.flags .plant{animation-delay:0.6s}')
  expect(bandOf('joy', { trek: 1 })).not.toContain('class="fly1"')
  expect(flagsIn(bandOf('puzzled', { trek: 3 }))).toBe(3)
  expect(bandOf('puzzled', { trek: 3 })).not.toContain('class="fly1"')
  expect(flagsIn(bandOf('idle', { trek: 3 }))).toBe(0)
})

test('a long turn ends where its camp stands, and the character runs home past its flags', () => {
  for (const mood of ['joy', 'puzzled', 'closing'] as const) {
    const frames = endingOf(mood, 6)

    expect(isAt(frames[0]?.x ?? HOME.x, campAt(6))).toBe(true)
    expect(frames[frames.length - 1]).toEqual(HOME)
    // Its say at the camp, before it runs.
    expect(frames.filter(frame => frame.say !== 'none').every(frame => isAt(frame.x, campAt(6)))).toBe(true)
    expect(frames.some(frame => frame.legs === 'a' && frame.scarf.startsWith('blowR'))).toBe(true)
    expectOnTrack(frames, false)
    expect(endingMsOf(mood, 6) > ENDING_MS[mood]).toBe(true)
    expect(endingMsOf(mood, 0)).toBe(ENDING_MS[mood])
    // The spark rolls home beside it, then the chase goes on.
    expect(bandOf(mood, { trek: 6 })).toContain('animation:spark-follow')
    expect(bandOf(mood)).not.toContain('spark-follow')
  }

  // The fullest band there can be stays within what the app draws: a hard ten-minute
  // turn answered on New Year's Eve, the snow deep, the snowman finished and dressed.
  const fullest = bandOf('joy', {
    occasion: 'newyear',
    drift: 4,
    snowman: { stage: 6, gifts: 3 },
    grand: true,
    trek: MAX_TREK,
  })

  expect(fullest.length < SVG_LIMIT).toBe(true)
})

test('the camp moves on each minute while Claude works, and walks home as it answers', async ($, on) => {
  const clock = mock.clock(on, { now: NOON })

  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const svg = async () => (await ui.find({ type: 'Svg' }))?.props
  const source = async () => String((await svg())?.source)
  const pennant = `d="${pathOf(TREK_FLAG.flag)}"`

  await $.turn.start({ text: 'migrate the database', turnId: 'trek' })
  expect((await source()).split(pennant).length - 1).toBe(0)
  await clock.advance(60_000)
  expect((await source()).split(pennant).length - 1).toBe(1)
  expect(await source()).toContain('class="plant" style="animation-delay:')
  expect(await source()).toContain('animation:spark-follow')
  await clock.advance(90_000)
  expect((await source()).split(pennant).length - 1).toBe(2)

  // Answered: the big flag at the camp, the run home, and the chase once it is home.
  await $.turn.complete({ answer: 'done', durationMs: 150_000, isAborted: false, turnId: 'trek', reason: 'answer' })
  expect(await source()).toContain('class="fly1"')
  expect(await source()).toContain('animation:spark-follow')
  await clock.advance(ENDING_MS.joy + 1000)
  expect((await svg())?.alt).toBe(ALT.joy)
  await clock.advance(endingMsOf('joy', 2) - ENDING_MS.joy)
  expect((await svg())?.alt).toBe(ALT.idle)
  await ui.unmount()
})

test('the camp holds still while the person is asked something, and moves on after', async ($, on) => {
  const clock = mock.clock(on, { now: NOON })
  const gates: (() => void)[] = []

  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('tool.call', () => new Promise(done => gates.push(() => done({ result: 'done' }))))
  on('classic.PermissionRequest', () => ({}))

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, isWorking: true }, surface: 'desktop' })
  const source = async () => String((await ui.find({ type: 'Svg' }))?.props.source)
  const pennant = `d="${pathOf(TREK_FLAG.flag)}"`

  await $.turn.start({ text: 'deploy it', turnId: 'ask' })

  const running = $.tool.call({ tool: 'Bash', command: 'make deploy', tool_use_id: 'deploy' })

  await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'make deploy' } })
  await clock.advance(70_000)
  // A minute gone, and still asking: no flag yet, the hand up.
  expect((await source()).split(pennant).length - 1).toBe(0)
  gates.shift()?.()
  await running
  await clock.advance(1500)
  expect((await source()).split(pennant).length - 1).toBe(1)
  await ui.unmount()
})

test('snow drifts up along the band as the context fills, clear of the ice', () => {
  expect([undefined, 0, 29, 30, 49, 50, 70, 84, 85, 100].map(driftOf)).toEqual([0, 0, 0, 1, 1, 2, 3, 3, 4, 4])

  const drifts = (band: string) => band.split('fill="#cfdbe8"').length - 1

  // Five mounds, a step deeper at each level; none at all while there is room.
  expect(bandOf('idle', { drift: 0 })).not.toContain('class="drift')
  expect(drifts(bandOf('idle', { drift: 1 }))).toBe(5)
  expect(drifts(bandOf('idle', { drift: 4 }))).toBe(20)
  expect(drifts(bandOf('working', { drift: 2 }))).toBe(10)

  // Every step of it stands on the ground, no higher than the level, and off the ice.
  const deep = bandOf('idle', { drift: 4 })
  const steps = [...deep.matchAll(/<rect x="([\d.]+)%" y="(\d+)" width="([\d.]+)%" height="(\d+)" fill="#cfdbe8"/g)]

  expect(steps.length).toBe(20)

  for (const [, x, y, width] of steps) {
    const from = Number(x) / 100
    const to = from + Number(width) / 100

    expect(Number(y) >= BAND_HEIGHT - UNIT - 4 * UNIT * 2).toBe(true)
    expect(to <= TRACK.iceStart.of || from >= TRACK.iceEnd.of).toBe(true)
  }

  // Shoveled: dug in, heaved over the shoulder, flung; the drifts sinking meanwhile.
  const { intro, loop } = shovelingOf()

  expect(loop.some(frame => frame.shovel === 'dig' && frame.crouch)).toBe(true)
  expect(loop.some(frame => frame.shovel === 'heave' && !frame.flung)).toBe(true)
  expect(loop.some(frame => frame.flung)).toBe(true)
  expectOnTrack(intro, false)
  expectOnTrack(loop, true)
  expect(bandOf('shovel', { drift: 3 })).toContain('animation:drift-down 6s ease-in forwards')
  expect(bandOf('idle', { drift: 3 })).not.toContain('drift-down')
})

// What a conversation compacts to, and what it compacts from, in the tests.
const SUMMARY = { role: 'user' as const, text: 'The summary so far.', toolUses: [] }
const TALK = [
  { role: 'user' as const, text: 'Make it snow.', toolUses: [] },
  { role: 'assistant' as const, text: 'It snows.', toolUses: [] },
]

test('the drifts follow the context, and the character shovels them away as it is compacted', async ($, on) => {
  // What the band says while the engine compacts, beneath the mod's own hook.
  let during: unknown

  mock.clock(on, { now: NOON })
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('session.compact', async () => {
    during = (await svg())?.alt

    return { messages: [SUMMARY] }
  })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const svg = async () => (await ui.find({ type: 'Svg' }))?.props
  const measure = (percent: number) =>
    $.session.measure({ context: { tokens: percent * 2000, window: 200_000, percent }, rateLimits: [], changed: ['context'] })

  await measure(20)
  expect(String((await svg())?.source)).not.toContain('class="drift')
  await measure(72)
  expect(String((await svg())?.source)).toContain('class="drift')
  expect((await svg())?.alt).toBe(`${ALT.idle}; the snow drifts deep as the context fills`)

  // While it is compacted the character shovels; done, the drifts are gone.
  await $.session.compact({ trigger: 'manual', messages: TALK })
  expect(during).toBe(ALT.shovel)
  expect((await svg())?.alt).toBe(ALT.idle)
  expect(String((await svg())?.source)).not.toContain('class="drift')

  // A subagent's compaction, or one only worked out ahead of time, is none of the band's.
  await measure(90)
  await $.session.compact({ trigger: 'auto', agentId: 'helper', messages: TALK })
  expect(during).toBe(`${ALT.idle}; the snow drifts deep as the context fills`)
  await $.session.compact({ trigger: 'precompute', messages: TALK })
  expect(during).toBe(`${ALT.idle}; the snow drifts deep as the context fills`)
  expect(String((await svg())?.source)).toContain('class="drift')
  await ui.unmount()
})

test('the snowman is built a part a day, and earns a gift at each step of answers', () => {
  const look = (band: string) => band.slice(band.indexOf('<g class="px snowman">'), band.indexOf('</g>', band.indexOf('<g class="px snowman">')) + 4)
  const day1 = look(bandOf('idle', { snowman: { stage: 1, gifts: 0 } }))
  const day4 = look(bandOf('idle', { snowman: { stage: 4, gifts: 0 } }))
  const whole = look(bandOf('idle'))
  const dressed = look(bandOf('idle', { snowman: { stage: 6, gifts: 3 } }))

  // A snowball, then a head, a face, a carrot, arms that wave back, a hat.
  expect(day1).not.toContain(COAL)
  expect(day1).not.toContain(CARROT)
  expect(day4).toContain(CARROT)
  expect(day4).not.toContain('class="m pal-')
  expect(whole).toContain('class="m pal-')
  expect(whole.split(`fill="${COAL}"`).length - 1).toBe(2)
  // A scarf, a broom, a star.
  expect(whole).not.toContain(KNIT_RED)
  expect(dressed).toContain(KNIT_RED)
  expect(dressed).toContain(PARTY_GOLD)
  expect(look(bandOf('idle', { snowman: { stage: 3, gifts: 3 } }))).not.toContain(PARTY_GOLD)

  // A part a day, counted once a day however many sessions; an answer at a time.
  const fresh: Build = { days: 0, lastDay: '', answers: 0 }
  const first = builtOn(fresh, '2026-11-18', false)
  const again = builtOn(first, '2026-11-18', true)
  const next = builtOn(again, '2026-11-19', false)

  expect(first).toEqual({ days: 1, lastDay: '2026-11-18', answers: 0 })
  expect(again).toEqual({ days: 1, lastDay: '2026-11-18', answers: 1 })
  expect(next).toEqual({ days: 2, lastDay: '2026-11-19', answers: 1 })
  expect(snowmanOf({ days: 40, lastDay: '', answers: 0 })).toEqual({ stage: 6, gifts: 0 })
  expect(GIFTS_AT.map(answers => snowmanOf({ days: 6, lastDay: '', answers }).gifts)).toEqual([1, 2, 3])
  expect(snowmanOf({ days: 6, lastDay: '', answers: (GIFTS_AT[0] ?? 0) - 1 }).gifts).toBe(0)
  expect(dayOf(NOON)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

test('the snowman grows a day at a time across sessions, and its gifts come with the answers', async ($, on) => {
  // Five minutes to midnight, with a snowman two days built and an answer short of a gift.
  const clock = mock.clock(on, { now: NOON + 12 * 3_600_000 - 5 * 60_000 })

  mock.store(on, { snowman: { days: 2, lastDay: '2026-01-01', answers: (GIFTS_AT[0] ?? 20) - 1 } })
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const snowman = async () => {
    const band = String((await ui.find({ type: 'Svg' }))?.props.source)
    const from = band.indexOf('<g class="px snowman">')

    return band.slice(from, band.indexOf('</g>', from) + 4)
  }

  // A new day: its face. Another session the same day adds nothing.
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(await snowman()).toContain(COAL)
  expect(await snowman()).not.toContain(CARROT)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(await snowman()).not.toContain(CARROT)

  // One more answer: the scarf.
  expect(await snowman()).not.toContain(KNIT_RED)
  await $.turn.start({ text: 'one more', turnId: 'gift' })
  await $.turn.complete({ answer: 'ok', durationMs: 10, isAborted: false, turnId: 'gift', reason: 'answer' })
  expect(await snowman()).toContain(KNIT_RED)

  // Past midnight in the same session: the carrot.
  await clock.advance(10 * 60_000)
  expect(await snowman()).toContain(CARROT)
  await ui.unmount()
})

test('the eyes follow the pointer to either side of the character', () => {
  const band = bandOf('idle')

  // A side of the band under the pointer turns the eyes that way, out to either end.
  expect(band).toContain('class="zone zone-l"')
  expect(band).toContain('class="zone zone-r"')
  expect(band).toContain('svg:has(.zone-l:hover) .gaze-l,svg:has(.zone-r:hover) .gaze-r{opacity:1}')
  expect(band).toContain('.zone{pointer-events:all}')

  // The zones ride with the character, under its own pixels, and reach both ends of
  // the widest band from wherever it stands.
  const left = band.match(/class="zone zone-l" x="(-?\d+)" y="(-?\d+)" width="(\d+)" height="(\d+)"/)
  const right = band.match(/class="zone zone-r" x="(-?\d+)" y="(-?\d+)" width="(\d+)" height="(\d+)"/)

  expect(Number(left?.[1]) <= -MAX_WIDTH).toBe(true)
  expect(Number(left?.[1]) + Number(left?.[3])).toBe(8)
  expect(Number(right?.[1])).toBe(28)
  expect(Number(right?.[1]) + Number(right?.[3]) >= MAX_WIDTH).toBe(true)
  expect(Number(left?.[4])).toBe(BAND_HEIGHT)
  expect(band.indexOf('class="zone zone-l"') < band.indexOf('class="poke"')).toBe(true)

  // Calm, nothing answers the pointer.
  expect(bandOf('idle', { calm: true })).not.toContain('zone')
})

test('the band yields to a survey, and the terminal draws none', async $ => {
  const survey = await $.ui.mount({
    ...BAND,
    props: { ...BAND.props, hasSurvey: true, isWorking: true },
    surface: 'desktop',
  })

  expect(await survey.find({ type: 'Svg' })).toBeUndefined()
  await survey.unmount()

  const terminal = await $.ui.mount({ ...BAND, surface: 'terminal' })

  // Only the engine's own node stands there: the mod drew nothing of its own.
  expect((await terminal.findAll({})).map(element => element.type)).toEqual(['engine'])
  await terminal.unmount()
})

test('the drawings kept never grow past a bound, the latest asked for staying', () => {
  let made = 0
  const draw = (key: string) =>
    drawn(key, () => {
      made++

      return `<svg>${key}</svg>`
    })
  const many = KEPT_DRAWINGS * 4

  // A long session's worth of moments, each drawn once: only the latest are kept.
  for (let index = 0; index < many; index++) {
    expect(draw(`moment:${index}`)).toBe(`<svg>moment:${index}</svg>`)
  }
  expect(keptDrawings()).toBe(KEPT_DRAWINGS)
  expect(made).toBe(many)

  // Asked for again, a kept one is not drawn again, and keeps its place a while longer:
  // the oldest goes before it.
  const oldest = `moment:${many - KEPT_DRAWINGS}`

  draw(oldest)
  draw('moment:new')
  draw(oldest)
  expect(made).toBe(many + 1)
  draw(`moment:${many - KEPT_DRAWINGS + 1}`)
  expect(made).toBe(many + 2)
  expect(keptDrawings()).toBe(KEPT_DRAWINGS)
})

test('the camp makes up the minutes it held still a station at a time, waving as it passes the snowman', async ($, on) => {
  const clock = mock.clock(on, { now: NOON })
  const gates: (() => void)[] = []

  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('tool.call', () => new Promise(done => gates.push(() => done({ result: 'done' }))))
  on('classic.PermissionRequest', () => ({}))

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, isWorking: true }, surface: 'desktop' })
  const svg = async () => (await ui.find({ type: 'Svg' }))?.props
  const minutes = async () => Number(/(\d+) minutes? into the turn/.exec(String((await svg())?.alt))?.[1] ?? 0)

  await $.turn.start({ text: 'deploy it', turnId: 'trek' })

  const running = $.tool.call({ tool: 'Bash', command: 'make deploy', tool_use_id: 'deploy' })

  // Six minutes asking: the camp holds at home, the hand up.
  await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'make deploy' } })
  await clock.advance(6 * 60_000)
  expect(String((await svg())?.alt).startsWith(WORK_ALT.wait)).toBe(true)
  expect(await minutes()).toBe(0)

  // Answered: on it goes, one station at a time, never skipping one.
  gates.shift()?.()
  await running
  expect(await minutes()).toBe(1)

  let last = 1
  let waved = false

  for (let look = 0; look < 12 && last < 6; look++) {
    await clock.advance(10_000)

    const now = await minutes()

    expect(now - last === 0 || now - last === 1).toBe(true)
    if (now === 5 && last === 4) {
      waved = String((await svg())?.source).includes('pal-wave')
    }
    last = now
  }
  expect(last).toBe(6)
  expect(waved).toBe(true)
  await ui.unmount()
})

test("Claude's own question and its plan raise the hand until the person answers", async ($, on) => {
  const clock = mock.clock(on, { now: NOON })
  const gates: (() => void)[] = []

  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('tool.call', () => new Promise(done => gates.push(() => done({ result: 'done' }))))
  // The engine puts each to the person as it would a permission prompt.
  on('classic.PermissionRequest', () => ({}))

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, isWorking: true }, surface: 'desktop' })
  const alt = async () => (await ui.find({ type: 'Svg' }))?.props.alt

  await $.turn.start({ text: 'plan the move', turnId: 'plan' })
  await clock.advance(openingMsOf('plain'))

  const question = { question: 'Which one?', header: 'Pick', options: [], multiSelect: false }

  for (const ask of [
    () => $.tool.call({ tool: 'AskUserQuestion', questions: [question], tool_use_id: 'ask-1' }),
    () => $.tool.call({ tool: 'ExitPlanMode', tool_use_id: 'plan-1' }),
  ]) {
    const call = ask()

    await clock.advance(1500)
    expect(await alt()).toBe(WORK_ALT.wait)
    gates.shift()?.()
    await call
    await clock.advance(1500)
    expect(await alt()).toBe(WORK_ALT.think)
  }
  expect(['AskUserQuestion', 'ExitPlanMode', 'LSP', 'TaskStop', 'mcp__claude-in-chrome__computer'].map(activityOf)).toEqual([
    'wait',
    'wait',
    'read',
    'run',
    'web',
  ])
  await ui.unmount()
})

test("an agent's question to the person raises the hand too, and only that agent's tool lowers it", async ($, on) => {
  const clock = mock.clock(on, { now: NOON })
  const gates = new Map<string, () => void>()

  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('tool.call', (_, e) => new Promise(done => gates.set(e.tool_use_id ?? '', () => done({ result: 'done' }))))
  // A rule of the person's lets any Glob run: a hook settles it, and nobody is asked.
  on('classic.PermissionRequest', (_, e) => (e.tool_name === 'Glob' ? { decision: { behavior: 'allow' as const } } : {}))

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, isWorking: true }, surface: 'desktop' })
  const alt = async () => String((await ui.find({ type: 'Svg' }))?.props.alt)
  const end = async (id: string, call: Promise<unknown>) => {
    gates.get(id)?.()
    await call
  }

  await $.turn.start({ text: 'look into it', turnId: 'main' })
  await $.turn.start({ text: 'go', turnId: 'scout-turn', agentId: 'scout' })
  await clock.advance(openingMsOf('plain'))

  // Settled by a hook before any dialog: no hand goes up.
  await $.classic.PermissionRequest({ tool_name: 'Glob', tool_input: { pattern: '*.md' } })
  await clock.advance(1500)
  expect((await alt()).startsWith(WORK_ALT.think)).toBe(true)

  // Claude reads while its agent runs a command that has to ask the person first.
  const reading = $.tool.call({ tool: 'Read', file_path: '/notes.md', tool_use_id: 'read-1' })
  const scouting = $.tool.call({ tool: 'Bash', command: 'make test', tool_use_id: 'scout-run', agentId: 'scout' })

  await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'make test' }, agent_id: 'scout' })
  await clock.advance(1500)
  expect((await alt()).startsWith(WORK_ALT.wait)).toBe(true)

  // Claude's own read ending answers nothing: the agent still waits on the person.
  await end('read-1', reading)
  await clock.advance(1500)
  expect((await alt()).startsWith(WORK_ALT.wait)).toBe(true)

  // The agent's command let run and done: the hand comes down.
  await end('scout-run', scouting)
  await clock.advance(1500)
  expect((await alt()).startsWith(WORK_ALT.think)).toBe(true)
  await ui.unmount()
})

test("a turn's end plays out even while the engine still says it works, and an end it does not know is a stop", async ($, on) => {
  const clock = mock.clock(on)

  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, isWorking: true }, surface: 'desktop' })
  const alt = async () => (await ui.find({ type: 'Svg' }))?.props.alt

  await $.turn.start({ text: 'go on', turnId: 'one' })
  expect(await alt()).toBe(ALT.working)
  await $.turn.complete({ answer: 'done', durationMs: 900, isAborted: false, turnId: 'one', reason: 'answer' })
  expect(await alt()).toBe(ALT.joy)
  await clock.advance(ENDING_MS.joy + 1000)
  expect(await alt()).toBe(ALT.working)

  await $.turn.start({ text: 'and again', turnId: 'two' })
  await $.turn.complete({
    answer: '',
    durationMs: 900,
    isAborted: false,
    turnId: 'two',
    reason: 'overloaded' as unknown as 'error',
  })
  expect(await alt()).toBe(ALT.closing)
  await ui.unmount()
})

test('with no store to answer, the session still starts with its look, and /winter still answers', async ($, on) => {
  let look: ThemeSetArgs | undefined
  let command: string | undefined

  mock.clock(on, { now: NOON })
  on('store.get', () => {
    throw new Error('no store here')
  })
  on('store.set', () => {
    throw new Error('no store here')
  })
  on('command.register', (_, e) => {
    command = e.name

    return { value: { command: e.name } }
  })
  on('theme.set', (_, e) => {
    look = e

    return { value: { isDrawn: true, requestId: 'backdrop' } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(look?.colors?.label).toBe('Winter')
  expect(command).toBe('winter')

  const winter = (args: string) =>
    $.command.run({
      command: 'winter',
      args,
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 80 },
    })

  expect((await winter('calm')).text).toContain('Winter: calm.')
  expect((await winter('')).text).toContain('Winter: calm.')
  expect((await winter('sound off')).text).toContain('sounds off')
})

test("held still, a long turn's ending shows the spark beside the character at its camp", () => {
  const sparkBy = TRACK.sparkHome.px - HOME.x.px
  const varsIn = (source: string, part: string) => {
    const found = new RegExp(`\\.${part}\\{--of:([-\\d.e]+);--px:([-\\d.e]+)px`).exec(source)

    return found === null ? undefined : { of: Number(found[1]), px: Number(found[2]) }
  }

  for (const trek of [0, 3, 6, 10]) {
    for (const calm of [false, true]) {
      const source = bandOf('joy', { calm, trek })
      const walker = varsIn(source, 'walker')
      const spark = varsIn(source, 'spark-x')

      expect(walker).toBeDefined()
      expect(spark).toBeDefined()
      expect(Math.abs((spark?.of ?? 0) - (walker?.of ?? 1)) < 1e-6).toBe(true)
      expect(Math.abs((spark?.px ?? 0) - (walker?.px ?? 0) - sparkBy) < 0.01).toBe(true)
      expect(Math.abs((walker?.of ?? 0) - campAt(trek).of) < 1e-6).toBe(true)
    }
  }
})

test('the screen reader hears how long a long turn has run; a bare "do" is a request, and the day reads alike everywhere', () => {
  const work = { activity: 'run' as const, opening: 'stay' as const, helpers: 0, tone: 'plain' as const, heat: 0 as const }

  expect(workAltOf({ ...work, trek: 0 })).toBe(WORK_ALT.run)
  expect(workAltOf({ ...work, trek: 1 })).toBe(`${WORK_ALT.run}, 1 minute into the turn, a flag on the snow for each`)
  expect(workAltOf({ ...work, trek: 7, helpers: 2 })).toBe(
    `${WORK_ALT.run}, 7 minutes into the turn, a flag on the snow for each, with 2 little helpers carrying parcels`,
  )

  expect(toneOf('do the refactor')).toBe('plain')
  expect(toneOf('do it again for the tests')).toBe('plain')
  expect(toneOf('do you think it works')).toBe('question')
  expect(toneOf('does it build on windows')).toBe('question')

  expect(dayOf(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05')
  expect(dayOf(new Date(2026, 11, 31, 0, 0).getTime())).toBe('2026-12-31')

  // The backdrop's style is escaped as the band's is: nothing in it a parser could take
  // for a tag.
  for (const sky of ['night', 'dawn', 'day', 'dusk'] as const) {
    const style = /<style>([\s\S]*?)<\/style>/.exec(sceneOf({ sky, occasion: 'ramadan' }))?.[1] ?? '<'

    expect(style.includes('<')).toBe(false)
  }
})

test("a slip in the band's own bookkeeping never fails Claude's tool, its question or its turn", async ($, on) => {
  // The engine beneath, with no clock to read: every look the band takes at it fails.
  on('clock.now', () => {
    throw new Error('no clock here')
  })
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('tool.call', () => ({ result: 'done' }))
  on('classic.PermissionRequest', () => ({}))

  expect(await $.turn.start({ text: 'go', turnId: 'slip' })).toEqual({ turnId: 'slip' })

  const ran = await $.tool.call({ tool: 'Bash', command: 'git commit -m "x"', tool_use_id: 'slip-1' })

  expect('result' in ran ? ran.result : undefined).toBe('done')
  expect(await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'ls' } })).toEqual({})
  expect(
    await $.turn.complete({ answer: 'done', durationMs: 100, isAborted: false, turnId: 'slip', reason: 'answer' }),
  ).toEqual({ text: 'done' })
})
