// The snowman built over days: a part for each day Claude Code is used, and a gift for
// each step of answers it has seen. Kept across sessions.

import type { Snowman } from '../types'

export type { Snowman }

// What the store keeps: how many days it has been worked on, the last of them on this
// machine's calendar, and how many answers it has seen.
export type Build = { days: number; lastDay: string; answers: number }

export const FRESH_BUILD: Build = { days: 0, lastDay: '', answers: 0 }

// The whole snowman, with its top hat, on the sixth day.
export const MAX_STAGE = 6

// The answers that earn each gift: a scarf, a broom, a star on its hat.
export const GIFTS_AT: readonly number[] = [20, 60, 150]

export const isBuild = (value: unknown): value is Build =>
  typeof value === 'object' &&
  value !== null &&
  'days' in value &&
  'lastDay' in value &&
  'answers' in value &&
  typeof value.days === 'number' &&
  typeof value.lastDay === 'string' &&
  typeof value.answers === 'number'

/** The day of `ms` on this machine's calendar, as YYYY-MM-DD. */
export function dayOf(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms)
}

/** The build after a look on `today`, with one more answer if `answered`. */
export function builtOn(build: Build, today: string, answered: boolean): Build {
  return {
    days: build.lastDay === today ? Math.max(1, build.days) : build.days + 1,
    lastDay: today,
    answers: build.answers + (answered ? 1 : 0),
  }
}

/** The snowman a build has come to. */
export function snowmanOf({ days, answers }: Build): Snowman {
  return {
    stage: Math.max(1, Math.min(MAX_STAGE, days)),
    gifts: GIFTS_AT.filter(at => answers >= at).length,
  }
}
