import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs, Timer, TurnCompleteReason } from 'claude-code'

import type { Activity, Focus, Motion, Occasion, Sky, Tone, Work } from '../types'
import { ALT, BAND_HEIGHT, ENDING_MS, MAX_WIDTH, bandOf, openingMsOf } from './band'
import type { Ending, Mood } from './band'
import { makeColors } from './make-colors.js'
import { WINTER } from './palette'
import { SCENE_ALT, SCENE_NAME, sceneOf } from './scene'
import { sameWhen, whenOf } from './time'
import { toneOf } from './tone'
import { FRESH_WORK, MAX_HELPERS, activityOf, heatOf, workAltOf } from './work'

const { theme, problems } = makeColors(WINTER)

const LOOK: ThemeSetArgs = {
  colors: theme,
  // A light frost: the snow stays in sight behind the panels, and the words stay first.
  backdrop: { scene: SCENE_NAME, glass: { blur: 4, opacity: 0.64 } },
}

// Each drawing, of the band or of the backdrop, is made the first time it is asked for,
// and kept. The band's fits whatever width the app gives it, on a desktop or a phone.
const drawings = new Map<string, string>()

function drawn(key: string, draw: () => string): string {
  let drawing = drawings.get(key)

  if (drawing === undefined) {
    drawing = draw()
    drawings.set(key, drawing)
  }

  return drawing
}

// The band at work is drawn for the work as well: what Claude is busy with, how the
// band opens, how many helpers are out, how the prompt sounded and how hard the turn
// works. A joy is drawn with fireworks or without.
const bandFor = (mood: Mood, calm: boolean, occasion: Occasion, work: Work, grand: boolean) => {
  const at = mood === 'working' ? work : FRESH_WORK
  const isGrand = mood === 'joy' && grand

  return drawn(
    `band:${mood}:${calm}:${occasion}:${at.activity}:${at.opening}:${at.helpers}:${at.tone}:${at.heat}:${isGrand}`,
    () => bandOf(mood, { calm, occasion, work: at, grand: isGrand }),
  )
}

// The focus band is drawn for how far into the session it comes on, so its rays show
// the time left; only the latest such drawing is kept.
function focusBandFor(calm: boolean, occasion: Occasion, focus: Focus, at: number): string {
  const key = `focus:${calm}:${occasion}:${focus.startedAt}:${focus.endsAt}:${at}`

  for (const old of drawings.keys()) {
    if (old.startsWith('focus:') && old !== key) {
      drawings.delete(old)
    }
  }

  return drawn(key, () =>
    bandOf('focus', {
      calm,
      occasion,
      focus: { totalMs: focus.endsAt - focus.startedAt, elapsedMs: Math.max(0, at - focus.startedAt) },
    }),
  )
}

const sceneFor = (sky: Sky, occasion: Occasion, calm: boolean) =>
  drawn(`scene:${sky}:${occasion}:${calm}`, () => sceneOf({ sky, occasion, calm }))

// The turn the band follows: under way, or how it just ended, with its id.
const beat = atom({ plugin: 'winter', key: 'beat' } as const, null)

// How much moves, as /winter last set it; the store keeps it for the next session.
const motion = atom({ plugin: 'winter', key: 'motion' } as const, 'on')

// The sky, the occasion and the lateness, as of the last minute's look at the clock.
const when = atom({ plugin: 'winter', key: 'when' } as const, { sky: 'day', occasion: 'none', isLate: false })

// Dozing, late at night with nothing asked for a while.
const isAsleep = atom({ plugin: 'winter', key: 'isAsleep' } as const, false)

// What the band shows of the work under way.
const work = atom({ plugin: 'winter', key: 'work' } as const, FRESH_WORK)

// The focus session under way, if any.
const focus = atom({ plugin: 'winter', key: 'focus' } as const, null)

// The least time a kind of work stays on the band before the next one takes its
// place, so a run of quick tools shows as one each a moment, not as a flicker.
const SHOW_WORK_MS = 1500

// How long the character waits, late at night, before it dozes off.
const DOZE_AFTER_MS = 3 * 60_000

const MOTIONS: readonly Motion[] = ['on', 'calm', 'off']
const isMotion = (value: unknown): value is Motion => MOTIONS.some(one => one === value)

// What /winter says back, in English and in Arabic.
const SAID: Readonly<Record<Motion, string>> = {
  on: 'Winter: everything moves. · الشتاء: كل شيء يتحرك.',
  calm: 'Winter: calm. The band and the snow hold still. · الشتاء: هدوء، يتوقف الشريط والثلج عن الحركة.',
  off: 'Winter: the band is hidden and the snow holds still. · الشتاء: الشريط مخفي والثلج ساكن.',
}
const USAGE =
  'Usage: /winter on | calm | off | focus [minutes] | focus stop · الاستخدام: /winter on | calm | off | focus [دقائق] | focus stop'

// A focus session's length when none is given, and the longest one.
const FOCUS_MINUTES = 25
const MAX_FOCUS_MINUTES = 180

// How long the bell rings once the time is up, before the chase comes back.
const BELL_MS = 6000

const focusSaid = (minutes: number) =>
  `Winter: focus for ${minutes} minute${minutes === 1 ? '' : 's'}. The spark's rays go out one by one, and a bell rings at the end. · ` +
  `الشتاء: تركيز لمدة ${minutes} دقيقة. تنطفئ أشعة الشرارة واحداً تلو الآخر، ويرنّ جرس في النهاية.`
const FOCUS_STOPPED = 'Winter: focus stopped. · الشتاء: توقف التركيز.'
const NO_FOCUS = 'Winter: no focus session is running. · الشتاء: لا توجد جلسة تركيز الآن.'
const FOCUS_UP = 'Winter: focus time is up. · الشتاء: انتهى وقت التركيز.'
const focusLeft = (minutes: number) =>
  `Focus: ${minutes} minute${minutes === 1 ? '' : 's'} left. · التركيز: بقي ${minutes} دقيقة.`

// How the character meets each way a turn can end.
const ENDING_OF: Readonly<Record<TurnCompleteReason, Ending>> = {
  answer: 'joy',
  refusal: 'puzzled',
  error: 'puzzled',
  aborted: 'closing',
}

// An ending plays on into the chase's still opening, a second and a half at home, so
// the band can wait this long after it before it changes to the chase unseen.
const SETTLE_MS = 1000

// When anything last happened: a session's start, a turn, a /winter. And the minute's
// look at the clock, started anew with each session's start.
let stirred = 0
let ticker: Timer | undefined

// The focus session's two timers: its end, and the bell's. And when the band last came
// on to the session, so it is drawn for that moment.
let focusEnd: Timer | undefined
let bellEnd: Timer | undefined
let focusShown: { startedAt: number; at: number } | undefined
let lastMood: Mood | undefined

// A look at the clock: the sky and the occasion, and whether to doze off. Each value is
// written only when it changes, so nothing is drawn again for nothing.
async function look($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  const next = whenOf(now)
  const isDozing = next.isLate && now - stirred >= DOZE_AFTER_MS

  if (!sameWhen(await read($, when), next)) {
    await update($, when, () => next)
  }
  if ((await read($, isAsleep)) !== isDozing) {
    await update($, isAsleep, () => isDozing)
  }
}

// Something happened: the character is awake for a while.
async function stir($: EngineInterface): Promise<void> {
  stirred = await $.clock.now()

  if (await read($, isAsleep)) {
    await update($, isAsleep, () => false)
  }
}

// The tools running on the main loop, by call, each with what the character does while
// it runs; whether a question waits on the person; when the band last changed work, the
// change it waits to make, and until when the turn's opening plays, uncut; and the
// agents out at work, by id.
const running = new Map<string, Activity>()
let isAsking = false
let shownAt = 0
let openedUntil = 0
let switching: Timer | undefined

// When the main loop's turn began, how many tools it has called, and the look every
// few seconds at how hard it is working.
let turnStartedAt = 0
let tools = 0
let heating: Timer | undefined
const HEAT_LOOK_MS = 10_000
const agents = new Set<string>()
let calls = 0

// What the band should show of the work now: a question first, then the tool begun
// last, and the laptop when none runs.
function wanted(): Activity {
  if (isAsking) {
    return 'wait'
  }
  let last: Activity = 'think'

  for (const activity of running.values()) {
    last = activity
  }

  return last
}

// Shows the work wanted, and how hard it goes, once what the band shows has had its
// moment; until then, sets the change to come when the moment is up, with whatever is
// wanted by then. A new kind of work opens with a puff; the same work, hotter, goes on.
async function showWork($: EngineInterface): Promise<void> {
  switching?.cancel()
  switching = undefined

  const now = await $.clock.now()
  const next = wanted()
  const heat = heatOf(now - turnStartedAt, tools)
  const shown = await read($, work)

  if (shown.activity === next && shown.heat >= heat) {
    return
  }
  const left = Math.max(shownAt + SHOW_WORK_MS, openedUntil) - now

  if (left > 0) {
    switching = $.clock.after(left, () => void showWork($))

    return
  }
  shownAt = now
  await update($, work, old => ({
    ...old,
    activity: next,
    heat: heat > old.heat ? heat : old.heat,
    opening: old.activity === next ? ('stay' as const) : ('switch' as const),
  }))
}

// A turn begins or ends: the band's next work opens the turn afresh, met by how its
// prompt sounds, the helpers kept. No tool's act cuts into the opening.
async function freshWork($: EngineInterface, tone: Tone = 'none'): Promise<void> {
  running.clear()
  isAsking = false
  switching?.cancel()
  switching = undefined
  heating?.cancel()
  heating = undefined
  shownAt = await $.clock.now()
  openedUntil = shownAt + openingMsOf(tone)
  turnStartedAt = shownAt
  tools = 0
  await update($, work, old => ({ ...FRESH_WORK, helpers: old.helpers, tone }))
}

// The helpers on the band: one for each agent out at work, up to the most drawn.
async function countHelpers($: EngineInterface): Promise<void> {
  const helpers = Math.min(agents.size, MAX_HELPERS)

  if ((await read($, work)).helpers !== helpers) {
    await update($, work, old => ({ ...old, helpers, opening: 'switch' as const }))
  }
}

// Starts a focus session of `minutes`, in place of any under way.
async function startFocus($: EngineInterface, minutes: number): Promise<void> {
  const now = await $.clock.now()

  await update($, focus, () => ({ startedAt: now, endsAt: now + minutes * 60_000, isDone: false }))
  armFocus($, minutes * 60_000)
}

// The session's end in `ms`: the bell.
function armFocus($: EngineInterface, ms: number): void {
  focusEnd?.cancel()
  bellEnd?.cancel()
  focusEnd = $.clock.after(ms, () => void ring($))
}

// The time is up: the bell rings a while, then the chase comes back.
async function ring($: EngineInterface): Promise<void> {
  focusEnd = undefined
  await update($, focus, now => (now === null ? null : { ...now, isDone: true }))
  $.ui.toast(FOCUS_UP)
  bellEnd?.cancel()
  bellEnd = $.clock.after(BELL_MS, () => void update($, focus, () => null))
}

async function stopFocus($: EngineInterface): Promise<void> {
  focusEnd?.cancel()
  bellEnd?.cancel()
  focusEnd = undefined
  bellEnd = undefined
  await update($, focus, () => null)
}

// "/winter focus 25", "/winter focus", "/winter focus stop": what to do, or nothing
// for words that are none of these.
function focusAsked(words: readonly string[]): { minutes: number } | 'stop' | undefined {
  const [, what] = words

  if (words.length === 1) {
    return { minutes: FOCUS_MINUTES }
  }
  if (words.length > 2 || what === undefined) {
    return undefined
  }
  if (what === 'stop' || what === 'off') {
    return 'stop'
  }
  const minutes = /^\d{1,3}$/.test(what) ? Number(what) : NaN

  return minutes >= 1 && minutes <= MAX_FOCUS_MINUTES ? { minutes } : undefined
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // While building: the line that would stop Desktop painting this look.
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    // A beat from before a reload belongs to a turn whose end may never reach this
    // load's timers; while a turn runs, the band's own isWorking still shows it.
    await update($, beat, () => null)

    // No work under way, and no helpers out.
    agents.clear()
    await freshWork($)
    await update($, work, () => FRESH_WORK)

    // A focus session from before a reload keeps its time: its end is set again, or,
    // if it has ended meanwhile, it is over.
    const session = await read($, focus)
    const now = await $.clock.now()

    focusShown = undefined
    lastMood = undefined

    if (session !== null && !session.isDone && session.endsAt > now) {
      armFocus($, session.endsAt - now)
    } else if (session !== null) {
      await stopFocus($)
    }

    // As /winter last left it, in this session or an earlier one.
    const kept = await $.store.get('motion')

    await update($, motion, () => (isMotion(kept) ? kept : 'on'))

    // The clock now, and once a minute from now on.
    await stir($)
    await look($)
    ticker?.cancel()
    ticker = $.clock.every(60_000, () => void look($))

    const set = await $.theme.set(LOOK)

    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }
    await $.command.register({
      name: 'winter',
      description: 'Calm the winter band and snow, hide the band, set them moving again, or focus for a while',
      argumentHint: 'on | calm | off | focus [minutes] | focus stop',
    })

    return next(e)
  })

  on('command.run', { command: 'winter' }, async ($, e) => {
    const asked = e.args.trim().toLowerCase()
    const words = asked.split(/\s+/)

    await stir($)

    if (asked === '') {
      const session = await read($, focus)
      const left =
        session === null || session.isDone
          ? ''
          : `\n${focusLeft(Math.max(1, Math.ceil((session.endsAt - (await $.clock.now())) / 60_000)))}`

      return { text: `${SAID[await read($, motion)]}${left}\n${USAGE}` }
    }
    if (words[0] === 'focus') {
      const what = focusAsked(words)

      if (what === undefined) {
        return { text: USAGE }
      }
      if (what === 'stop') {
        const hadOne = (await read($, focus)) !== null

        await stopFocus($)

        return { text: hadOne ? FOCUS_STOPPED : NO_FOCUS }
      }
      await startFocus($, what.minutes)

      return { text: focusSaid(what.minutes) }
    }
    if (!isMotion(asked)) {
      return { text: USAGE }
    }
    await $.store.set('motion', asked)
    await update($, motion, () => asked)

    return { text: SAID[asked] }
  })

  // The main loop's turns open the work, met by how the prompt sounds; an agent's turn
  // brings a helper out.
  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      await stir($)
      await freshWork($, toneOf(e.text))
      await update($, beat, () => ({ mood: 'working', turnId: e.turnId, heat: 0 }))
      // Every few seconds, a look at how hard the turn is working.
      heating = $.clock.every(HEAT_LOOK_MS, () => void showWork($))
    } else {
      agents.add(e.agentId)
      await countHelpers($)
    }

    return next(e)
  })

  // A tool on the main loop: the character acts it out while it runs.
  on('tool.call', async ($, e, next) => {
    if (e.agentId !== undefined) {
      return next(e)
    }
    const call = e.tool_use_id ?? `call-${calls++}`

    tools++
    running.set(call, activityOf(e.tool))
    await showWork($)

    try {
      return await next(e)
    } finally {
      running.delete(call)
      isAsking = false
      await showWork($)
    }
  })

  // A permission dialog is about to ask the person: a hand goes up until the tool is
  // let run and done, or refused.
  on('classic.PermissionRequest', async ($, e, next) => {
    if (e.agent_id === undefined) {
      isAsking = true
      await showWork($)
    }

    return next(e)
  })

  on('classic.PermissionDenied', async ($, e, next) => {
    if (e.agent_id === undefined) {
      isAsking = false
      await showWork($)
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) {
      // An agent's run is over: its helper goes back.
      agents.delete(e.agentId)
      await countHelpers($)
    } else {
      const mood = ENDING_OF[e.reason]
      const { turnId } = e
      // How hard it worked, by the end: a hard turn answered ends in fireworks.
      const { heat } = await read($, work)

      await stir($)
      await freshWork($)
      await update($, beat, () => ({ mood, turnId, heat }))

      // Then back to the chase, unless another turn has begun meanwhile.
      $.clock.after(ENDING_MS[mood] + SETTLE_MS, () => {
        void update($, beat, now => (now?.turnId === turnId && now.mood === mood ? null : now))
      })
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // The terminal draws no Svg, and a survey has the band to itself.
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.hasSurvey) {
      return next(e)
    }

    const how = await read($, motion)

    if (how === 'off') {
      return next(e)
    }

    const now = await read($, beat)
    const { occasion } = await read($, when)
    const session = await read($, focus)
    // The engine's word that a turn runs comes first; the beat bridges the moments
    // around it, so the work shows from the turn's start and its end plays out. With
    // neither, a focus session sits still or rings its bell; and with none, it sleeps
    // late at night when nothing has happened for a while.
    const rest: Mood =
      session !== null ? (session.isDone ? 'bell' : 'focus') : (await read($, isAsleep)) ? 'sleep' : 'idle'
    const mood: Mood = e.props.isWorking ? 'working' : (now?.mood ?? rest)
    const at = await read($, work)
    const { Box, Svg } = $.ui.resolve(e)
    const calm = how === 'calm'

    // A focus session is drawn for the moment the band comes on to it.
    if (mood === 'focus' && session !== null && (lastMood !== 'focus' || focusShown?.startedAt !== session.startedAt)) {
      focusShown = { startedAt: session.startedAt, at: await $.clock.now() }
    }
    lastMood = mood

    const source =
      mood === 'focus' && session !== null
        ? focusBandFor(calm, occasion, session, focusShown?.at ?? session.startedAt)
        : bandFor(mood, calm, occasion, at, (now?.heat ?? 0) >= 2)
    const minutes = session === null ? 0 : Math.round((session.endsAt - session.startedAt) / 60_000)
    const alt =
      mood === 'working'
        ? workAltOf(at)
        : mood === 'focus'
          ? `${ALT.focus} of ${minutes} minute${minutes === 1 ? '' : 's'}`
          : ALT[mood]

    // The widest the stage can be: the desktop draws the frame that wide but never past
    // its slot (max-width 100%), so the band runs the slot's whole width, and the drawing
    // lays its track out to fit the frame. With no width at all, the desktop's frame
    // would stay at a browser's default 300 pixels.
    return (
      <Box>
        <Svg
          source={source}
          alt={alt}
          width={MAX_WIDTH}
          height={BAND_HEIGHT}
          isInteractive
        />
      </Box>
    )
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }

    if (e.props.scene !== SCENE_NAME) {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)
    const how = await read($, motion)
    const { sky, occasion } = await read($, when)

    return <Svg source={sceneFor(sky, occasion, how !== 'on')} alt={SCENE_ALT} isInteractive />
  })
}
