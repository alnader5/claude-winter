import type { ThemeSetArgs } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { FoundElement } from 'claude-code/testing'

import {
  ALT,
  BAND_HEIGHT,
  ENDING_MS,
  HOME,
  MAX_HOP,
  bandOf,
  endingOf,
  isOnIce,
  printsOf,
  reelOf,
  storyOf,
  trackOf,
  trailOf,
  workingOf,
} from '../hooks/band'
import type { Frame } from '../hooks/band'
import { checkColors } from '../hooks/make-colors.js'
import { CARROT, KNIT_RED, LID_GRAY, SPRITE_WIDTH, STRIPE, TICK, UNIT } from '../hooks/sprite'

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

// The rules every frame keeps, in every mood: on the grid and on the track, no higher
// than the pom-pom allows, a balloon only on the ground, and no frame leaping across.
function expectOnTrack(frames: readonly Frame[], width: number, isLoop: boolean) {
  frames.forEach((frame, index) => {
    const next = isLoop ? frames[(index + 1) % frames.length] : frames[index + 1]

    expect(frame.x % UNIT).toBe(0)
    expect(frame.x >= 0 && frame.x + SPRITE_WIDTH <= width).toBe(true)
    expect(frame.hop >= 0 && frame.hop <= MAX_HOP).toBe(true)
    expect(frame.say === 'none' || frame.hop === 0).toBe(true)
    expect(Math.abs((next?.x ?? frame.x) - frame.x) <= 2 * UNIT).toBe(true)
  })
}

test('the session starts with the whole look, and its colors have no problem', async ($, on) => {
  let look: ThemeSetArgs | undefined

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

test("Claude's pixel character and the spark share the band above the prompt", async $ => {
  for (const [surface, width] of [
    ['desktop', 320],
    ['mobile', 220],
  ] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    const svg = await ui.find({ type: 'Svg' })
    const source = String(svg?.props.source)

    expect(svg?.props).toMatchObject({ width, height: BAND_HEIGHT, isInteractive: true })
    expect(svg?.props.alt).toBe("Claude's pixel character chasing a small orange spark along the band")
    expect(source).toContain('#d97757')
    // The sprite's pixels stay square and sharp, and it moves a whole frame at a time.
    expect(source).toContain('shape-rendering:crispEdges')
    expect(source).toContain('animation-timing-function:step-end')
    // The spark rolls to the far end of its own track and no further.
    expect(source).toContain(`translateX(${width - 24}px)`)
    // Dressed for the cold, beside a snowman.
    expect(source).toContain(KNIT_RED)
    expect(source).toContain(STRIPE)
    expect(source).toContain(CARROT)
    // Nothing of the work is drawn in the chase: no laptop, no glow.
    expect(source).not.toContain(LID_GRAY)
    expect(source).not.toContain('class="glow"')
    expect(source.length < SVG_LIMIT).toBe(true)
    await ui.unmount()
  }
})

test('the character moves on the pixel grid and stays on its track', () => {
  for (const width of [320, 220]) {
    const { frames, spark } = storyOf(width)

    // The loop closes where it opened, standing at home beside the spark.
    expect(frames[frames.length - 1]).toEqual(frames[0])
    expect(frames[0]).toEqual(HOME)
    expect(HOME.x).toBe(spark.home - 38)
    expectOnTrack(frames, width, true)

    // The spark's rolls come in order inside the loop.
    expect(0 < spark.out && spark.out + spark.outFrames < spark.back).toBe(true)
    expect(spark.back + spark.backFrames < frames.length).toBe(true)
    // It is out at the far end before the character gets near, and home before it returns.
    expect(frames.findIndex(frame => frame.x >= spark.far - 38 - 2 * UNIT) > spark.out + spark.outFrames).toBe(true)
    expect(
      frames.findIndex((frame, index) => index > spark.back && frame.x === spark.home - 38) >
        spark.back + spark.backFrames,
    ).toBe(true)
  }
})

test('a snowflake lands on the spark, which shakes it off before it rolls away', () => {
  const { frames, spark } = storyOf(320)
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
  const { frames } = storyOf(320)
  const arrived = frames.findIndex(frame => frame.x === trackOf(320).stop)

  expect(frames.slice(arrived, arrived + 8).some(frame => frame.breath !== 'none')).toBe(true)

  frames.forEach((frame, index) => {
    const before = frames[(index - 1 + frames.length) % frames.length] ?? frame
    const dx = frame.x - before.x

    // Out to the left while it moves right, to the right while it moves left.
    expect(dx > 0 ? frame.scarf.startsWith('blowL') : dx < 0 ? frame.scarf.startsWith('blowR') : frame.scarf === 'still').toBe(
      true,
    )
  })
})

test('the walk home slides across the ice and stops to wave to the snowman', () => {
  for (const width of [320, 220]) {
    const track = trackOf(width)
    const { frames } = storyOf(width)
    const slides = frames.filter(frame => frame.arms === 'out')

    // Sliding happens on the ice, or skidding a step or two past its edge.
    expect(slides.length > 0).toBe(true)
    expect(slides.every(frame => [-8, -6, -4, -2, 0, 2, 4, 6, 8].some(d => isOnIce(track, frame.x + d)))).toBe(true)
    // Walking home over the ice is all sliding: no step is taken on it.
    frames.forEach((frame, index) => {
      const before = frames[index - 1]

      if (before !== undefined && frame.x < before.x && isOnIce(track, frame.x)) {
        expect(frame.arms).toBe('out')
      }
    })

    // It waves at the snowman's side, looking at it, and the snowman waves back there.
    const waves = frames.filter(frame => frame.pal === 'wave')

    expect(waves.length > 0).toBe(true)
    expect(waves.every(frame => frame.x === track.greet && frame.eyes === 'left')).toBe(true)
    expect(frames.some(frame => frame.x === track.greet && frame.arms === 'up')).toBe(true)
    // The snowman stands clear of the spark at home, and the ice clear of both stops.
    expect(track.snowman - 3 * UNIT > track.sparkHome + 24).toBe(true)
    expect(isOnIce(track, track.greet) || isOnIce(track, track.stop)).toBe(false)
  }
})

test('footprints melt in the snow, never on the ice, and the spark sheds sparks on its dash', () => {
  for (const width of [320, 220]) {
    const track = trackOf(width)
    const story = storyOf(width)
    const prints = printsOf(story, track)
    const embers = trailOf(story)
    const source = bandOf(width, 'idle')

    expect(prints.size > 10).toBe(true)
    for (const at of prints.keys()) {
      expect(at + UNIT <= track.iceStart || at >= track.iceEnd).toBe(true)
    }
    // Shed on the dash home, one a frame, each about where the spark is then.
    expect(embers.length > 5).toBe(true)
    expect(embers.every(ember => ember.at > story.spark.back && ember.at < story.spark.back + story.spark.backFrames)).toBe(
      true,
    )
    expect(embers.every(ember => ember.x > story.spark.home && ember.x < story.spark.far + 24 + 4 * UNIT)).toBe(true)
    expect((source.match(/class="print"/g) ?? []).length).toBe(prints.size)
    expect((source.match(/class="ember"/g) ?? []).length).toBe(embers.length)
  }

  // The work leaves no tracks.
  expect(bandOf(320, 'working')).not.toContain('class="print"')
})

test('while Claude works, the character types at a laptop and the spark whirls', async $ => {
  for (const [surface, width] of [
    ['desktop', 320],
    ['mobile', 220],
  ] as const) {
    const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, isWorking: true }, surface })
    const svg = await ui.find({ type: 'Svg' })
    const source = String(svg?.props.source)

    expect(svg?.props).toMatchObject({ width, height: BAND_HEIGHT, isInteractive: true })
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
  expect(loop.every(frame => frame.x === HOME.x && frame.hop === 0 && frame.laptop === 'open')).toBe(true)
  expect(loop.some(frame => frame.arms === 'tapL') && loop.some(frame => frame.arms === 'tapR')).toBe(true)
  expect(['think1', 'think2', 'think3'].every(say => loop.some(frame => frame.say === say))).toBe(true)
  expect(poster).toMatchObject({ laptop: 'open' })
  expectOnTrack(intro, 220, false)
  expectOnTrack(loop, 220, true)
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

    // From the laptop as the work left it, to home, standing.
    expect(frames[0]).toMatchObject({ x: HOME.x, laptop: 'open' })
    expect(frames[frames.length - 1]).toEqual(HOME)
    expect(ENDING_MS[mood]).toBe(Math.round((frames.length / 12) * 1000))
    // The laptop is gone before it jumps or says a thing.
    expect(gone > 0).toBe(true)
    expect(frames.slice(0, gone).every(frame => frame.hop === 0 && frame.say === 'none')).toBe(true)
    expectOnTrack(frames, 220, false)

    for (const width of [320, 220]) {
      const reel = reelOf(width, mood)
      const source = bandOf(width, mood)

      // It plays on into the chase.
      expect(reel.intro).toEqual(frames)
      expect(reel.loop).toEqual(storyOf(width).frames)
      expect(source).toContain('animation:spark-settle')
      expect(source.length < SVG_LIMIT).toBe(true)
    }
  }

  // Joy hops and shows a tick; a turn without an answer gets a "?".
  expect(endingOf('joy').some(frame => frame.hop > 0)).toBe(true)
  expect(endingOf('joy').some(frame => frame.say === 'done')).toBe(true)
  expect(bandOf(320, 'joy')).toContain(TICK)
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
    const source = bandOf(320, mood)

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
