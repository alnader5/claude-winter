import type { ThemeSetArgs } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { FoundElement } from 'claude-code/testing'

import {
  ALT,
  BAND_HEIGHT,
  ENDING_MS,
  HOME,
  MAX_HOP,
  MAX_WIDTH,
  MIN_WIDTH,
  REFERENCE_WIDTH,
  TRACK,
  bandOf,
  endingOf,
  isOnIce,
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
  CARROT,
  KNIT_PINK,
  KNIT_RED,
  LANTERN_GOLD,
  LID_GRAY,
  PARTY_PURPLE,
  SPRITE_WIDTH,
  STRIPE,
  TICK,
  UNIT,
} from '../hooks/sprite'
import { whenOf } from '../hooks/time'

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
    // The spark rolls to the far end of the stage, whatever its width, on the grid.
    expect(source).toContain('translateX(round(nearest,calc(1 * var(--w) - 24px),2px))')
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
