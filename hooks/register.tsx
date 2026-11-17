import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs, Timer, TurnCompleteReason } from 'claude-code'

import type { Activity, Motion, Occasion, Sky, Work } from '../types'
import { ALT, BAND_HEIGHT, ENDING_MS, MAX_WIDTH, bandOf } from './band'
import type { Ending, Mood } from './band'
import { makeColors } from './make-colors.js'
import { WINTER } from './palette'
import { SCENE_ALT, SCENE_NAME, sceneOf } from './scene'
import { sameWhen, whenOf } from './time'
import { FRESH_WORK, MAX_HELPERS, activityOf, workAltOf } from './work'

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
// band opens, and how many helpers are out.
const bandFor = (mood: Mood, calm: boolean, occasion: Occasion, work: Work) => {
  const at = mood === 'working' ? work : FRESH_WORK

  return drawn(`band:${mood}:${calm}:${occasion}:${at.activity}:${at.opening}:${at.helpers}`, () =>
    bandOf(mood, { calm, occasion, work: at }),
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
const USAGE = 'Usage: /winter on | calm | off · الاستخدام: /winter on | calm | off'

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
// it runs; whether a question waits on the person; when the band last changed work, and
// the change it waits to make; and the agents out at work, by id.
const running = new Map<string, Activity>()
let isAsking = false
let shownAt = 0
let switching: Timer | undefined
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

// Shows the work wanted, once what the band shows has had its moment; until then, sets
// the change to come when the moment is up, with whatever is wanted by then.
async function showWork($: EngineInterface): Promise<void> {
  switching?.cancel()
  switching = undefined

  const next = wanted()

  if ((await read($, work)).activity === next) {
    return
  }
  const now = await $.clock.now()
  const left = shownAt + SHOW_WORK_MS - now

  if (left > 0) {
    switching = $.clock.after(left, () => void showWork($))

    return
  }
  shownAt = now
  await update($, work, old => ({ ...old, activity: next, opening: 'switch' as const }))
}

// A turn begins or ends: the band's next work opens the turn afresh, the helpers kept.
async function freshWork($: EngineInterface): Promise<void> {
  running.clear()
  isAsking = false
  switching?.cancel()
  switching = undefined
  shownAt = await $.clock.now()
  await update($, work, old => ({ ...FRESH_WORK, helpers: old.helpers }))
}

// The helpers on the band: one for each agent out at work, up to the most drawn.
async function countHelpers($: EngineInterface): Promise<void> {
  const helpers = Math.min(agents.size, MAX_HELPERS)

  if ((await read($, work)).helpers !== helpers) {
    await update($, work, old => ({ ...old, helpers, opening: 'switch' as const }))
  }
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
      description: 'Calm the winter band and snow, hide the band, or set them moving again',
      argumentHint: 'on | calm | off',
    })

    return next(e)
  })

  on('command.run', { command: 'winter' }, async ($, e) => {
    const asked = e.args.trim().toLowerCase()

    await stir($)

    if (asked === '') {
      return { text: `${SAID[await read($, motion)]}\n${USAGE}` }
    }
    if (!isMotion(asked)) {
      return { text: USAGE }
    }
    await $.store.set('motion', asked)
    await update($, motion, () => asked)

    return { text: SAID[asked] }
  })

  // The main loop's turns open the work; an agent's turn brings a helper out.
  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      await stir($)
      await freshWork($)
      await update($, beat, () => ({ mood: 'working', turnId: e.turnId }))
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

      await stir($)
      await freshWork($)
      await update($, beat, () => ({ mood, turnId }))

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
    // The engine's word that a turn runs comes first; the beat bridges the moments
    // around it, so the work shows from the turn's start and its end plays out. With
    // neither, it sleeps late at night when nothing has happened for a while.
    const rest: Mood = (await read($, isAsleep)) ? 'sleep' : 'idle'
    const mood: Mood = e.props.isWorking ? 'working' : (now?.mood ?? rest)
    const at = await read($, work)
    const { Box, Svg } = $.ui.resolve(e)

    // The widest the stage can be: the desktop draws the frame that wide but never past
    // its slot (max-width 100%), so the band runs the slot's whole width, and the drawing
    // lays its track out to fit the frame. With no width at all, the desktop's frame
    // would stay at a browser's default 300 pixels.
    return (
      <Box>
        <Svg
          source={bandFor(mood, how === 'calm', occasion, at)}
          alt={mood === 'working' ? workAltOf(at) : ALT[mood]}
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
