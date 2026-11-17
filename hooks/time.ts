// The time of day and of year, as the clock on this machine reads them: the sky the
// backdrop shows, an occasion the band dresses for, and whether it is late at night.

import type { Occasion, Sky, When } from '../types'

export type { Occasion, Sky, When }

// Hours of the local day, each sky from its hour to the next one's.
const SKIES: readonly (readonly [number, Sky])[] = [
  [0, 'night'],
  [5, 'dawn'],
  [8, 'day'],
  [17, 'dusk'],
  [19, 'night'],
]

// The month of the Hijri year a moment falls in, by the Umm al-Qura calendar; undefined
// where the runtime cannot say.
function hijriMonthOf(date: Date): number | undefined {
  try {
    const month = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric' })
      .formatToParts(date)
      .find(part => part.type === 'month')?.value

    return month === undefined ? undefined : Number(month)
  } catch {
    return undefined
  }
}

/**
 * The sky, the occasion and the lateness of the moment `ms` milliseconds after the
 * epoch, in this machine's time zone.
 */
export function whenOf(ms: number): When {
  const date = new Date(ms)
  const hour = date.getHours()
  const sky = SKIES.reduce<Sky>((found, [from, one]) => (hour >= from ? one : found), 'night')
  const isNewYear = (date.getMonth() === 11 && date.getDate() === 31) || (date.getMonth() === 0 && date.getDate() === 1)
  const occasion: Occasion = isNewYear ? 'newyear' : hijriMonthOf(date) === 9 ? 'ramadan' : 'none'

  return { sky, occasion, isLate: hour < 5 }
}

export const sameWhen = (one: When, other: When) =>
  one.sky === other.sky && one.occasion === other.occasion && one.isLate === other.isLate
