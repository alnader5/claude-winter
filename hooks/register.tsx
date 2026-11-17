import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs, Timer, TurnCompleteReason } from 'claude-code'

import type { Motion, Occasion, Sky } from '../types'
import { ALT, BAND_HEIGHT, ENDING_MS, MAX_WIDTH, bandOf } from './band'
import type { Ending, Mood } from './band'
import { makeColors } from './make-colors.js'
import { WINTER } from './palette'
import { SCENE_ALT, SCENE_NAME, sceneOf } from './scene'
import { sameWhen, whenOf } from './time'

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

const bandFor = (mood: Mood, calm: boolean, occasion: Occasion) =>
  drawn(`band:${mood}:${calm}:${occasion}`, () => bandOf(mood, { calm, occasion }))

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

  // The main loop's turns alone: a subagent's come and go inside them.
  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      await stir($)
      await update($, beat, () => ({ mood: 'working', turnId: e.turnId }))
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      const mood = ENDING_OF[e.reason]
      const { turnId } = e

      await stir($)
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
    const { Box, Svg } = $.ui.resolve(e)

    // The widest the stage can be: the desktop draws the frame that wide but never past
    // its slot (max-width 100%), so the band runs the slot's whole width, and the drawing
    // lays its track out to fit the frame. With no width at all, the desktop's frame
    // would stay at a browser's default 300 pixels.
    return (
      <Box>
        <Svg
          source={bandFor(mood, how === 'calm', occasion)}
          alt={ALT[mood]}
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
