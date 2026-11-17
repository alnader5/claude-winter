// What Claude is busy with while it works, as the band acts it out: the kind of tool
// running on the main loop, none (thinking and writing), or a question waiting on the
// person. How many helpers it has out: the agents it sent off, still at work. And how
// the turn's prompt sounded.

import type { Activity, Heat, Opening, Tone, Work } from '../types'

export type { Activity, Heat, Opening, Tone, Work }

export const FRESH_WORK: Work = { activity: 'think', opening: 'start', helpers: 0, tone: 'none', heat: 0 }

// How long a turn runs, and how many tools it calls, to reach each heat: either does.
export const HEAT_AFTER_MS: readonly number[] = [0, 20_000, 60_000, 180_000]
export const HEAT_AFTER_TOOLS: readonly number[] = [0, 5, 15, 40]

/** The heat of a turn that has run `ms` milliseconds and called `tools` tools. */
export function heatOf(ms: number, tools: number): Heat {
  let heat: Heat = 0

  for (const level of [1, 2, 3] as const) {
    if (ms >= (HEAT_AFTER_MS[level] ?? Infinity) || tools >= (HEAT_AFTER_TOOLS[level] ?? Infinity)) {
      heat = level
    }
  }

  return heat
}

// The most helpers drawn at once: past this many, the band would be crowded.
export const MAX_HELPERS = 3

// Tools by name, and what the character does while each runs.
const KINDS: Readonly<Record<string, Activity>> = {
  Read: 'read',
  Grep: 'read',
  Glob: 'read',
  LS: 'read',
  NotebookRead: 'read',
  Edit: 'edit',
  Write: 'edit',
  MultiEdit: 'edit',
  NotebookEdit: 'edit',
  Bash: 'run',
  BashOutput: 'run',
  KillShell: 'run',
  Monitor: 'run',
  WebSearch: 'web',
  WebFetch: 'web',
}

/**
 * What the character does while `tool` runs. A browser's tools, whoever serves them,
 * are a look out at the web; any other tool is work at the laptop.
 */
export function activityOf(tool: string): Activity {
  return KINDS[tool] ?? (/browser|navigate|web/i.test(tool) ? 'web' : 'think')
}

// The band at work in words, for a screen reader.
export const WORK_ALT: Readonly<Record<Activity, string>> = {
  think: "Claude's pixel character typing at a laptop while the spark spins: Claude is working",
  edit: "Claude's pixel character typing fast as code flies off its laptop to the spark: Claude is editing files",
  read: "Claude's pixel character reading a book beside the spark: Claude is reading files",
  run: "Claude's pixel character working the lever of a little terminal: Claude is running a command",
  web: "Claude's pixel character looking far out through binoculars: Claude is searching the web",
  wait: "Claude's pixel character raising its hand: Claude is waiting for your answer",
}

export function workAltOf({ activity, helpers, tone, heat }: Work): string {
  const hard = heat >= 2 ? `${WORK_ALT[activity]}, hard at it for a while now` : WORK_ALT[activity]
  const alt = tone === 'urgent' ? `${hard}, in a hurry` : hard

  return helpers === 0 ? alt : `${alt}, with ${helpers} little helper${helpers === 1 ? '' : 's'} carrying parcels`
}
