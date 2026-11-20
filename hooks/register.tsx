import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs, Timer, TurnCompleteReason } from 'claude-code'

import type { Activity, Beat, Drift, Focus, Motion, Occasion, Snowman, Sky, Tone, Work } from '../types'
import { ALT, BAND_HEIGHT, MAX_WIDTH, bandOf, endingMsOf, introMsOf, openingMsOf } from './band'
import type { Ending, Mood } from './band'
import { drawn } from './drawings'
import { makeColors } from './make-colors.js'
import { WINTER } from './palette'
import { SCENE_ALT, SCENE_NAME, sceneOf } from './scene'
import { bothOf, cheerOf } from './git'
import type { Cheer } from './git'
import { sameWhen, whenOf } from './time'
import { FRESH_BUILD, builtOn, dayOf, isBuild, snowmanOf } from './snowman'
import { forgetPlayer, playSound } from './sound'
import type { Sound } from './sound'
import { toneOf } from './tone'
import { FRESH_WORK, MAX_HELPERS, activityOf, driftOf, heatOf, trekOf, workAltOf } from './work'

const { theme, problems } = makeColors(WINTER)

const LOOK: ThemeSetArgs = {
  colors: theme,
  // A light frost: the snow stays in sight behind the panels, and the words stay first.
  backdrop: { scene: SCENE_NAME, glass: { blur: 4, opacity: 0.64 } },
}

// The band at work is drawn for the work as well: what Claude is busy with, how the
// band opens, how many helpers are out, how the prompt sounded, how hard the turn works
// and how long it has run. An ending is drawn for how hard and long its turn was:
// fireworks for a hard one answered, flags for a long one.
const bandFor = (
  mood: Mood,
  calm: boolean,
  occasion: Occasion,
  work: Work,
  ended: Beat | null,
  drift: Drift,
  snowman: Snowman,
) => {
  const at = mood === 'working' ? work : FRESH_WORK
  const isEnding = mood === 'joy' || mood === 'puzzled' || mood === 'closing'
  const grand = mood === 'joy' && (ended?.heat ?? 0) >= 2
  const trek = isEnding ? (ended?.trek ?? 0) : 0

  return drawn(
    `band:${mood}:${calm}:${occasion}:${at.activity}:${at.opening}:${at.helpers}:${at.tone}:${at.heat}:${at.trek}:${grand}:${trek}:${drift}:${snowman.stage}:${snowman.gifts}`,
    () => bandOf(mood, { calm, occasion, work: at, grand, trek, drift, snowman }),
  )
}

// The focus band is drawn for how far into the session it comes on, so its rays show
// the time left.
function focusBandFor(
  calm: boolean,
  occasion: Occasion,
  focus: Focus,
  at: number,
  drift: Drift,
  snowman: Snowman,
): string {
  const key = `focus:${calm}:${occasion}:${focus.startedAt}:${focus.endsAt}:${at}:${drift}:${snowman.stage}:${snowman.gifts}`

  return drawn(key, () =>
    bandOf('focus', {
      calm,
      occasion,
      drift,
      snowman,
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

// How deep the snow has drifted, by how full the context is; and whether the
// conversation is being compacted, the snow shoveled away.
const drift = atom({ plugin: 'winter', key: 'drift' } as const, 0)
const isShoveling = atom({ plugin: 'winter', key: 'isShoveling' } as const, false)

// The snowman as far as it is built: a snowball on the first day.
const snowman = atom({ plugin: 'winter', key: 'snowman' } as const, { stage: 1, gifts: 0 })

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
  'Usage: /winter on | calm | off | focus [minutes] | focus stop | sound on | sound off · ' +
  'الاستخدام: /winter on | calm | off | focus [دقائق] | focus stop | sound on | sound off'

// What /winter sound says back: which player played the chime that says so, or, with
// none to play it, what would.
const soundOn = (player: string) =>
  player === 'none'
    ? 'Winter: sounds on, but no sound player answered on this machine. On Linux, PipeWire (pw-play), ' +
      "PulseAudio (paplay) or ALSA (aplay) plays them; under WSL, Windows' PowerShell does. The mod looks again " +
      'every ten minutes, and at the next /winter sound on. · الشتاء: الأصوات مفعّلة، لكن لم يستجب أي مشغّل صوت ' +
      'على هذا الجهاز. على Linux يشغّلها PipeWire ‏(pw-play) أو PulseAudio ‏(paplay) أو ALSA ‏(aplay)، وفي WSL ' +
      'يشغّلها PowerShell من Windows. يعيد المود البحث كل عشر دقائق، وعند /winter sound on التالي.'
    : `Winter: sounds on, played with ${player}: a chime when Claude answers, a bell when a focus session ends, ` +
      `a pop for a commit or a push. · الشتاء: الأصوات مفعّلة عبر ${player}: رنّة حين يجيب Claude، ` +
      'وجرس عند نهاية جلسة التركيز، ونقرة لكل commit أو push.'
const SOUNDS_ON = 'Winter: sounds on. · الشتاء: الأصوات مفعّلة.'
const SOUNDS_OFF = 'Winter: sounds off. · الشتاء: الأصوات متوقفة.'

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
const FOCUS_RANGE =
  `Winter: a focus session runs from 1 to ${MAX_FOCUS_MINUTES} minutes, such as /winter focus 25. · ` +
  `الشتاء: تمتد جلسة التركيز من دقيقة واحدة إلى ${MAX_FOCUS_MINUTES} دقيقة، مثل ‎/winter focus 25.`
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

// The band's own bookkeeping, around what it watches: a slip in it costs the band a
// beat, and never holds up or fails the event it rides on, Claude's tool, the person's
// answer, or a timer's next round.
async function quietly(work: () => unknown): Promise<void> {
  try {
    await work()
  } catch {
    // The band misses this beat; what it watches goes on.
  }
}

// Whether the sounds are on, as /winter sound last left it; off until it is asked for.
let isSounding = false

// A sound of the mod's, if the sounds are on: `chime`, `bell` or `pop`, played by the
// first of the system's players that runs. Nothing waits on it.
function play($: EngineInterface, sound: Sound): void {
  if (isSounding) {
    void quietly(() => playSound($, sound))
  }
}

// The focus session's two timers: its end, and the bell's. And when the band last came
// on to the session, so it is drawn for that moment.
let focusEnd: Timer | undefined
let bellEnd: Timer | undefined
let focusShown: { startedAt: number; at: number } | undefined
let lastMood: Mood | undefined

// What the store keeps under `key`: nothing where no store answers, so the mod still
// starts and answers as it would on a first run.
async function kept($: EngineInterface, key: string): Promise<unknown> {
  try {
    return await $.store.get(key)
  } catch {
    return undefined
  }
}

// Keeps `value` under `key` for the next sessions, where a store answers; this session
// goes on with it either way.
async function keep($: EngineInterface, key: string, value: unknown): Promise<void> {
  try {
    await $.store.set(key, value)
  } catch {
    // Kept for this session only.
  }
}

// The day the snowman was last worked on, as this load saw it.
let builtDay = ''

// The snowman's build moves on: a part on a new day, a step nearer a gift with each
// answer. The store keeps it; with none to keep it in, the snowman stays as it is.
async function build($: EngineInterface, answered: boolean): Promise<void> {
  try {
    const stored = await $.store.get('snowman')
    const was = isBuild(stored) ? stored : FRESH_BUILD
    const now = builtOn(was, dayOf(await $.clock.now()), answered)

    builtDay = now.lastDay

    if (now.days !== was.days || now.answers !== was.answers || now.lastDay !== was.lastDay) {
      await $.store.set('snowman', now)
    }
    const look = snowmanOf(now)
    const shown = await read($, snowman)

    if (shown.stage !== look.stage || shown.gifts !== look.gifts) {
      await update($, snowman, () => look)
    }
  } catch {
    // No store answered: the snowman stays as it is drawn.
  }
}

// A look at the clock: the sky and the occasion, and whether to doze off. Each value is
// written only when it changes, so nothing is drawn again for nothing. A new day builds
// the snowman on.
async function look($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  const next = whenOf(now)
  const isDozing = next.isLate && now - stirred >= DOZE_AFTER_MS

  if (builtDay !== '' && dayOf(now) !== builtDay) {
    await build($, false)
  }

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

// Whether a turn of the main loop is under way; the tools running on it, by call, each
// with what the character does while it runs; the loops a permission prompt waits on
// the person for ('' for the main loop, else the agent's id); when the band last
// changed work, the change it waits to make, and until when the turn's opening plays,
// uncut; and the agents out at work, by id.
let isTurning = false
const running = new Map<string, Activity>()
const asking = new Set<string>()
const agents = new Set<string>()
let shownAt = 0
let openedUntil = 0
let switching: Timer | undefined

// The loop an event happened in, as `asking` names it.
const loopOf = (agentId: string | undefined) => agentId ?? ''

// When the main loop's turn began, how many tools it has called, and the look every
// few seconds at how hard it is working.
let turnStartedAt = 0
let tools = 0
let heating: Timer | undefined
const HEAT_LOOK_MS = 10_000

// What git just did that the band has yet to celebrate; and a count for naming a call
// that comes with no id.
let cheered: Cheer | undefined
let calls = 0

// What the band should show of the work now: a question to the person first, Claude's
// or an agent's, then the tool begun last, and the laptop when none runs.
function wanted(): Activity {
  if (asking.size > 0) {
    return 'wait'
  }
  let last: Activity = 'think'

  for (const activity of running.values()) {
    last = activity
  }

  return last
}

// Shows the work wanted, how hard it goes and the helpers out, once what the band
// shows has had its moment; until then, sets the change to come when the moment is up,
// with whatever is wanted by then. A new kind of work opens with a puff; the same work,
// hotter or with a helper more or less, goes on. Between turns only the helpers change.
async function showWork($: EngineInterface): Promise<void> {
  switching?.cancel()
  switching = undefined

  const shown = await read($, work)
  const helpers = Math.min(agents.size, MAX_HELPERS)

  if (!isTurning) {
    if (shown.helpers !== helpers) {
      await update($, work, old => ({ ...old, helpers }))
    }

    return
  }
  const now = await $.clock.now()
  const next = wanted()
  const heat = heatOf(now - turnStartedAt, tools)
  // A long turn's camp moves on a station each minute, one at a time, so it never skips
  // one: not while the person is asked something, nor through a cheer, and the minutes
  // that went by meanwhile it makes up a station a look.
  const due = trekOf(now - turnStartedAt)
  const trek = next === 'wait' || cheered !== undefined ? shown.trek : Math.max(shown.trek, Math.min(shown.trek + 1, due))

  if (
    shown.activity === next &&
    shown.heat >= heat &&
    shown.trek >= trek &&
    shown.helpers === helpers &&
    cheered === undefined
  ) {
    return
  }
  const left = Math.max(shownAt + SHOW_WORK_MS, openedUntil) - now

  if (left > 0) {
    switching = $.clock.after(left, () => void quietly(() => showWork($)))

    return
  }
  shownAt = now

  const cheer = cheered

  cheered = undefined

  const shownNow = await update($, work, old => ({
    ...old,
    activity: next,
    helpers,
    heat: heat > old.heat ? heat : old.heat,
    trek: Math.max(old.trek, trek),
    opening: cheer ?? (trek > old.trek ? ('onward' as const) : old.activity === next ? ('stay' as const) : ('switch' as const)),
  }))

  // No change of work cuts into the walk on, the cheer or the prop coming out.
  openedUntil = Math.max(openedUntil, now + introMsOf(shownNow))
}

// A shell command that ran and did something in git worth a cheer, while a turn is
// under way: the band shows it next.
async function cheerFor($: EngineInterface, command: string): Promise<boolean> {
  const cheer = cheerOf(command)

  if (cheer === undefined || (await read($, beat))?.mood !== 'working') {
    return false
  }
  cheered = bothOf(cheered, cheer)
  play($, 'pop')

  return true
}

// A turn begins or ends: the band's next work opens the turn afresh, met by how its
// prompt sounds, the helpers kept. No tool's act cuts into the opening. An agent's
// question, if one waits, still waits.
async function freshWork($: EngineInterface, tone: Tone = 'none'): Promise<void> {
  running.clear()
  asking.delete('')
  switching?.cancel()
  switching = undefined
  heating?.cancel()
  heating = undefined
  cheered = undefined
  shownAt = await $.clock.now()
  openedUntil = shownAt + openingMsOf(tone)
  turnStartedAt = shownAt
  tools = 0
  await update($, work, old => ({ ...FRESH_WORK, helpers: old.helpers, tone }))
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
  focusEnd = $.clock.after(ms, () => void quietly(() => ring($)))
}

// The time is up: the bell rings a while, then the chase comes back.
async function ring($: EngineInterface): Promise<void> {
  focusEnd = undefined
  await update($, focus, now => (now === null ? null : { ...now, isDone: true }))
  $.ui.toast(FOCUS_UP)
  play($, 'bell')
  bellEnd?.cancel()
  bellEnd = $.clock.after(BELL_MS, () => void quietly(() => update($, focus, () => null)))
}

async function stopFocus($: EngineInterface): Promise<void> {
  focusEnd?.cancel()
  bellEnd?.cancel()
  focusEnd = undefined
  bellEnd = undefined
  await update($, focus, () => null)
}

// "/winter focus 25", "/winter focus", "/winter focus stop": what to do; `range` for a
// number of minutes too few or too many; nothing for words that are none of these.
function focusAsked(words: readonly string[]): { minutes: number } | 'stop' | 'range' | undefined {
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
  if (!/^\d+$/.test(what)) {
    return undefined
  }
  const minutes = Number(what)

  return minutes >= 1 && minutes <= MAX_FOCUS_MINUTES ? { minutes } : 'range'
}

// Each hook that stands between Claude and what it does (a tool, a permission prompt,
// a compaction) keeps its own slips to itself, and should one get past, its guard
// passes the event on as it was: the band never holds up or changes Claude's work.
export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // The look first, and the command: nothing that follows can keep them back.
    await quietly(async () => {
      const set = await $.theme.set(LOOK)

      if (!set.isDrawn) {
        $.ui.status(set.reason)
      }
    })
    await quietly(() =>
      $.command.register({
        name: 'winter',
        description: 'Calm the winter band and snow, hide the band, set them moving again, focus for a while, or turn sounds on',
        argumentHint: 'on | calm | off | focus [minutes] | focus stop | sound on | sound off',
      }),
    )

    await quietly(async () => {
      // While building: the line that would stop Desktop painting this look.
      const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

      if (unpainted !== undefined) {
        $.ui.toast(unpainted)
      }
      // A beat from before a reload belongs to a turn whose end may never reach this
      // load's timers; while a turn runs, the band's own isWorking still shows it.
      await update($, beat, () => null)

      // No work under way, no helpers out and no question waiting.
      isTurning = false
      agents.clear()
      asking.clear()
      await freshWork($)
      await update($, work, () => FRESH_WORK)

      // A focus session from before a reload keeps its time: its end is set again, or,
      // if it has ended meanwhile, it is over.
      const session = await read($, focus)
      const now = await $.clock.now()

      focusShown = undefined
      lastMood = undefined

      // No compaction is under way as a session starts or reloads.
      await update($, isShoveling, () => false)

      if (session !== null && !session.isDone && session.endsAt > now) {
        armFocus($, session.endsAt - now)
      } else if (session !== null) {
        await stopFocus($)
      }

      // As /winter last left it, in this session or an earlier one.
      const moving = await kept($, 'motion')

      await update($, motion, () => (isMotion(moving) ? moving : 'on'))
      isSounding = (await kept($, 'sound')) === true
      forgetPlayer()

      // The snowman as far as it is built, a part on to it on a new day.
      await build($, false)

      // The clock now, and once a minute from now on.
      await stir($)
      await look($)
      ticker?.cancel()
      ticker = $.clock.every(60_000, () => void quietly(() => look($)))
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

      return { text: `${SAID[await read($, motion)]}${left}\n${isSounding ? SOUNDS_ON : SOUNDS_OFF}\n${USAGE}` }
    }
    if (words[0] === 'sound') {
      const [, what] = words

      if (words.length !== 2 || (what !== 'on' && what !== 'off')) {
        return { text: USAGE }
      }
      isSounding = what === 'on'
      await keep($, 'sound', isSounding)

      if (!isSounding) {
        return { text: SOUNDS_OFF }
      }
      // A chime to say so, and which player played it, looked for afresh: one may have
      // been installed since the last look.
      forgetPlayer()

      return { text: soundOn(await playSound($, 'chime')) }
    }
    if (words[0] === 'focus') {
      const what = focusAsked(words)

      if (what === undefined) {
        return { text: USAGE }
      }
      if (what === 'range') {
        return { text: FOCUS_RANGE }
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
    await keep($, 'motion', asked)
    await update($, motion, () => asked)

    return { text: SAID[asked] }
  })

  // The main loop's turns open the work, met by how the prompt sounds; an agent's turn
  // brings a helper out.
  on('turn.start', async ($, e, next) => {
    await quietly(async () => {
      if (e.agentId === undefined) {
        await stir($)
        await freshWork($, toneOf(e.text))
        isTurning = true
        await update($, beat, () => ({ mood: 'working', turnId: e.turnId, heat: 0, trek: 0 }))
        // Every few seconds, a look at how hard the turn is working.
        heating = $.clock.every(HEAT_LOOK_MS, () => void quietly(() => showWork($)))
      } else {
        agents.add(e.agentId)
        await showWork($)
      }
    })

    return next(e)
  })

  // A tool on the main loop: the character acts it out while it runs. A commit or a
  // push that went through, Claude's own or an agent's, is cheered. A tool's end, in
  // any loop, answers the question that loop was waiting on, if any: a loop asks for
  // one tool at a time, and goes on only once the person has answered. The tool's own
  // outcome is passed on as it is, whatever becomes of the band's.
  on('tool.call', async ($, e, next) => {
    if (e.agentId !== undefined) {
      const loop = loopOf(e.agentId)
      let result: Awaited<ReturnType<typeof next>> | undefined

      try {
        result = await next(e)

        return result
      } finally {
        const ran = result

        await quietly(async () => {
          const wasAsking = asking.delete(loop)
          const isCheer =
            e.tool === 'Bash' &&
            ran !== undefined &&
            ran.deny === undefined &&
            ran.isError !== true &&
            (await cheerFor($, e.command))

          if (wasAsking || isCheer) {
            await showWork($)
          }
        })
      }
    }
    const call = e.tool_use_id ?? `call-${calls++}`

    // A tool on the main loop: a turn is under way. One this load did not see begin (it
    // began before a reload) is timed from now, its heat and its minutes with it.
    if (!isTurning) {
      isTurning = true
      tools = 0
      await quietly(async () => {
        turnStartedAt = await $.clock.now()
      })
    }
    tools++
    running.set(call, activityOf(e.tool))
    await quietly(() => showWork($))

    let result: Awaited<ReturnType<typeof next>> | undefined

    try {
      result = await next(e)

      return result
    } finally {
      const ran = result

      running.delete(call)
      asking.delete('')
      await quietly(async () => {
        if (e.tool === 'Bash' && ran !== undefined && ran.deny === undefined && ran.isError !== true) {
          await cheerFor($, e.command)
        }
        await showWork($)
      })
    }
  }).catch(($, e, next) => next(e))

  // A permission dialog is about to ask the person, for Claude or for one of its
  // agents: a hand goes up until the tool is let run and done, or refused. One that a
  // hook settles first (a rule of the person's, another mod) asks nobody.
  on('classic.PermissionRequest', async ($, e, next) => {
    const answer = await next(e)

    if (answer.decision === undefined) {
      asking.add(loopOf(e.agent_id))
      await quietly(() => showWork($))
    }

    return answer
  }).catch(($, e, next) => next(e))

  on('classic.PermissionDenied', async ($, e, next) => {
    if (asking.delete(loopOf(e.agent_id))) {
      await quietly(() => showWork($))
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  // After each turn the engine measures the session: the snow drifts as deep as the
  // context is full, drawn again only when it changes.
  on('session.measure', async ($, e, next) => {
    await quietly(async () => {
      const level = driftOf(e.context.percent)

      if ((await read($, drift)) !== level) {
        await update($, drift, () => level)
      }
    })

    return next(e)
  })

  // The conversation compacted: the character shovels the snow away while it runs,
  // and the drifts are gone once it is done. A subagent's own compaction, or one only
  // worked out ahead of time, is none of the band's.
  on('session.compact', async ($, e, next) => {
    if (e.agentId !== undefined || e.trigger === 'precompute') {
      return next(e)
    }
    await quietly(() => update($, isShoveling, () => true))

    try {
      const result = await next(e)

      if (result.skip === undefined) {
        await quietly(() => update($, drift, () => 0))
      }

      return result
    } finally {
      await quietly(() => update($, isShoveling, () => false))
    }
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    await quietly(async () => {
      if (e.agentId !== undefined) {
        // An agent's run is over: its helper goes back, its question if any with it.
        agents.delete(e.agentId)
        asking.delete(loopOf(e.agentId))
        await showWork($)

        return
      }
      // A way of ending this version does not know yet is met as a stop is.
      const mood = ENDING_OF[e.reason] ?? 'closing'
      const { turnId } = e
      // How hard and how long it worked, by the end: a hard turn answered ends in
      // fireworks, a long one in a flag planted. The ending starts where the camp
      // stands, its flags as the band showed them, and walks home from there.
      const shown = await read($, work)
      const heat = shown.heat
      const trek = shown.trek

      await stir($)
      isTurning = false
      await freshWork($)
      await update($, beat, () => ({ mood, turnId, heat, trek }))

      // An answer brings the snowman a step nearer its next gift, and a chime.
      if (e.reason === 'answer') {
        play($, 'chime')
        await build($, true)
      }

      // Then back to the chase, unless another turn has begun meanwhile.
      $.clock.after(endingMsOf(mood, trek) + SETTLE_MS, () => {
        void quietly(() => update($, beat, now => (now?.turnId === turnId && now.mood === mood ? null : now)))
      })
    })

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
    // A turn's end plays out first, whatever the engine still says of the work in the
    // moment after it; then the engine's word that a turn runs; and the beat bridges
    // the moment before that word, so the work shows from the turn's start. With none
    // of these, a focus session sits still or rings its bell; and with none, it sleeps
    // late at night when nothing has happened for a while.
    const rest: Mood =
      session !== null ? (session.isDone ? 'bell' : 'focus') : (await read($, isAsleep)) ? 'sleep' : 'idle'
    const isEnding = now !== null && now.mood !== 'working'
    // Shoveling while the conversation is compacted comes before all.
    const mood: Mood = (await read($, isShoveling))
      ? 'shovel'
      : isEnding
        ? now.mood
        : e.props.isWorking
          ? 'working'
          : (now?.mood ?? rest)
    const deep = await read($, drift)
    const built = await read($, snowman)
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
        ? focusBandFor(calm, occasion, session, focusShown?.at ?? session.startedAt, deep, built)
        : bandFor(mood, calm, occasion, at, now, deep, built)
    const minutes = session === null ? 0 : Math.round((session.endsAt - session.startedAt) / 60_000)
    const said =
      mood === 'working'
        ? workAltOf(at)
        : mood === 'focus'
          ? `${ALT.focus} of ${minutes} minute${minutes === 1 ? '' : 's'}`
          : ALT[mood]
    // Deep snow says the context is nearly full.
    const alt = deep >= 3 && mood !== 'shovel' ? `${said}; the snow drifts deep as the context fills` : said

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
