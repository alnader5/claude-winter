import type { ThemeSetArgs } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { ALT, BAND_HEIGHT, ENDING_MS, HOME, bandOf, endingOf, reelOf, storyOf, workingOf } from '../hooks/band'
import type { Frame } from '../hooks/band'
import { checkColors } from '../hooks/make-colors.js'
import { LID_GRAY, SPRITE_HEIGHT, SPRITE_WIDTH, TICK, UNIT } from '../hooks/sprite'

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
// than the band, a balloon only on the ground, and no frame leaping across the track.
function expectOnTrack(frames: readonly Frame[], width: number, isLoop: boolean) {
  const lowest = BAND_HEIGHT - SPRITE_HEIGHT

  frames.forEach((frame, index) => {
    const next = isLoop ? frames[(index + 1) % frames.length] : frames[index + 1]

    expect(frame.x % UNIT).toBe(0)
    expect(frame.x >= 0 && frame.x + SPRITE_WIDTH <= width).toBe(true)
    expect(frame.hop >= 0 && frame.hop <= lowest).toBe(true)
    expect(frame.say === 'none' || frame.hop === 0).toBe(true)
    expect(Math.abs((next?.x ?? frame.x) - frame.x) <= 2 * UNIT).toBe(true)
  })
}

test('the session starts with the whole look, and its colors have no problem', async ($, on) => {
  let look: ThemeSetArgs | undefined

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
  expect(intro.slice(0, intro.findIndex(frame => frame.laptop !== 'none')).length).toBeGreaterThan(0)
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
