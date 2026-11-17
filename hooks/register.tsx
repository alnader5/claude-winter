import { atom, read, update } from 'claude-code'
import type { Register, ThemeSetArgs, TurnCompleteReason } from 'claude-code'

import { ALT, BAND_HEIGHT, ENDING_MS, bandOf } from './band'
import type { Ending, Mood } from './band'
import { makeColors } from './make-colors.js'
import { WINTER } from './palette'
import { SCENE, SCENE_ALT, SCENE_NAME } from './scene'

const { theme, problems } = makeColors(WINTER)

const LOOK: ThemeSetArgs = {
  colors: theme,
  // A light frost: the snow stays in sight behind the panels, and the words stay first.
  backdrop: { scene: SCENE_NAME, glass: { blur: 4, opacity: 0.64 } },
}

// The band's track in CSS pixels, narrower on a phone, drawn in every mood once, as
// the mod loads.
const MOODS: readonly Mood[] = ['idle', 'working', 'joy', 'puzzled', 'closing']

const bandsOf = (width: number) => ({
  width,
  source: Object.fromEntries(MOODS.map(mood => [mood, bandOf(width, mood)])) as Record<Mood, string>,
})

const BAND = { desktop: bandsOf(320), mobile: bandsOf(220) }

// The turn the band follows: under way, or how it just ended, with its id.
const beat = atom({ plugin: 'winter', key: 'beat' } as const, null)

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

    const set = await $.theme.set(LOOK)

    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }

    return next(e)
  })

  // The main loop's turns alone: a subagent's come and go inside them.
  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      await update($, beat, () => ({ mood: 'working', turnId: e.turnId }))
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      const mood = ENDING_OF[e.reason]
      const { turnId } = e

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

    const now = await read($, beat)
    // The engine's word that a turn runs comes first; the beat bridges the moments
    // around it, so the work shows from the turn's start and its end plays out.
    const mood: Mood = e.props.isWorking ? 'working' : (now?.mood ?? 'idle')
    const { Box, Svg } = $.ui.resolve(e)
    const { width, source } = BAND[e.surface]

    return (
      <Box>
        <Svg source={source[mood]} alt={ALT[mood]} width={width} height={BAND_HEIGHT} isInteractive />
      </Box>
    )
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }

    if (e.props.scene !== SCENE_NAME) {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    return <Svg source={SCENE} alt={SCENE_ALT} isInteractive />
  })
}
