import type { ThemeSetArgs } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { FoundElement } from 'claude-code/testing'

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
  openingMsOf,
  pixelsOf,
  printsOf,
  reelOf,
  sleepingOf,
  storyOf,
  trailOf,
  workingOf,
} from '../hooks/band'
import type { Frame, Place } from '../hooks/band'
import { checkColors } from '../hooks/make-colors.js'
import { sceneOf } from '../hooks/scene'
import {
  BLUSH_PINK,
  CARROT,
  KNIT_PINK,
  KNIT_RED,
  LANTERN_GOLD,
  LID_GRAY,
  PARTY_PURPLE,
  SPRITE_WIDTH,
  STRIPE,
  SWEAT_BLUE,
  TICK,
  UNIT,
} from '../hooks/sprite'
import { whenOf } from '../hooks/time'
import { toneOf } from '../hooks/tone'
import { MAX_HELPERS, WORK_ALT, activityOf, heatOf, type Activity, type Tone } from '../hooks/work'

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
    // Dressed for the cold, beside a snowman.
    expect(source).toContain(KNIT_RED)
    expect(source).toContain(STRIPE)
    expect(source).toContain(CARROT)
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
  expect(frames.slice(shaken + 6).every(frame => frame.flake === null && frame.tilt === 0)).toBe(true)
  expect(shaken + 6 < spark.out).toBe(true)
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
  expect(frames.slice(popped + 3).every(frame => frame.sparkScale === 1 && frame.sparkDip === 0)).toBe(true)
  // Snow kicked up going in and coming out.
  expect(frames.slice(gone - 3, gone + 1).map(frame => frame.burst)).toEqual(['snow1', 'snow2', 'snow3', 'none'])
  expect(frames.slice(popped - 1, popped + 3).map(frame => frame.burst)).toEqual(['snow1', 'snow2', 'snow3', 'none'])

  // All of it on the chase's clock, and on the ending's after its intro.
  const chase = `${Number((frames.length / 12).toFixed(3))}s`

  expect(bandOf('idle')).toContain(`.spark-pose{animation:spark-pose ${chase} linear infinite}`)
  expect(bandOf('joy')).toContain(`.spark-pose{animation:spark-pose ${chase} linear `)
  expect(bandOf('working')).not.toContain('animation:spark-pose')
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
    // It plays on into the chase.
    expect(reel.intro).toEqual(frames)
    expect(reel.loop).toEqual(storyOf().frames)
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
  expect((await winter('focus 0')).text).toContain('Usage')
  expect((await winter('focus 181')).text).toContain('Usage')
  expect((await winter('focus soon')).text).toContain('Usage')

  // A reload in the middle keeps its time.
  await winter('focus 10')
  await clock.advance(4 * 60_000)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect((await svg())?.alt).toBe(`${ALT.focus} of 10 minutes`)
  await clock.advance(6 * 60_000)
  expect((await svg())?.alt).toBe(ALT.bell)
  await ui.unmount()
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
      expect(bandOf('working', { work: { activity, opening, helpers: 3, tone: 'urgent', heat: 0 } }).length < SVG_LIMIT).toBe(true)
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
  expect(bandOf('working', { work: { activity: 'edit', opening: 'switch', helpers: 0, tone: 'plain', heat: 0 } })).toContain(
    'animation:spark-whirl 1.6s linear infinite',
  )
  expect(bandOf('working', { work: { activity: 'wait', opening: 'switch', helpers: 0, tone: 'plain', heat: 0 } })).not.toContain(
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
  mock.clock(on, { now: NOON })
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, isWorking: true }, surface: 'desktop' })
  const svg = async () => (await ui.find({ type: 'Svg' }))?.props
  const helpersDrawn = async () => (String((await svg())?.source).match(/class="helper"/g) ?? []).length

  await $.turn.start({ text: 'split the work', turnId: 'main' })
  expect(await helpersDrawn()).toBe(0)

  for (const agentId of ['scout', 'reader']) {
    await $.turn.start({ text: 'go', turnId: `${agentId}-turn`, agentId })
  }
  expect(await helpersDrawn()).toBe(2)
  expect((await svg())?.alt).toBe(`${WORK_ALT.think}, with 2 little helpers carrying parcels`)

  await $.turn.complete({
    answer: 'found it',
    durationMs: 300,
    isAborted: false,
    turnId: 'scout-turn',
    agentId: 'scout',
    reason: 'answer',
  })
  expect(await helpersDrawn()).toBe(1)

  // No more than three at once, however many go out.
  for (const agentId of ['a', 'b', 'c', 'd']) {
    await $.turn.start({ text: 'go', turnId: `${agentId}-turn`, agentId })
  }
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
  const hurried = bandOf('working', { work: { activity: 'edit', opening: 'switch', helpers: 0, tone: 'urgent', heat: 0 } })
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
    bandOf('working', { work: { activity: 'edit', opening: 'stay', helpers: 0, tone: 'plain', heat } })

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
  expect((await svg())?.alt).toBe(`${WORK_ALT.think}, hard at it for a while now`)
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
