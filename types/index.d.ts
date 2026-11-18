// The turn the band above the prompt follows: under way ('working'), or how it just
// ended, until the band goes back to the chase. `turnId` is that turn's, so a timer
// left from one turn never clears the next one's beat. `heat` is how hard the turn
// worked, by its end: a hard one ends in fireworks. `trek` is how many whole minutes
// it ran, a flag along the snow for each: a long one ends with a big flag planted.
export type Beat = {
  mood: 'working' | 'joy' | 'puzzled' | 'closing'
  turnId: string
  heat: Heat
  trek: number
}

// How much of the winter moves, as /winter last set it: everything ('on'), nothing
// ('calm'), or nothing and no band ('off'). Kept in the store across sessions too.
export type Motion = 'on' | 'calm' | 'off'

// The sky the backdrop shows, by the hour of this machine's clock.
export type Sky = 'night' | 'dawn' | 'day' | 'dusk'

// What the band dresses for: New Year's day and its eve, and the month of Ramadan.
export type Occasion = 'none' | 'newyear' | 'ramadan'

export type When = {
  sky: Sky
  occasion: Occasion
  // After midnight and before five: late enough for the character to doze off.
  isLate: boolean
}

// What Claude is busy with while it works, as the band acts it out: the kind of tool
// running on the main loop, none (thinking and writing), or a question waiting on the
// person.
export type Activity = 'think' | 'edit' | 'read' | 'run' | 'web' | 'wait'

// How a work band starts: with the turn ("!", the prop coming up), with the work
// switching from one kind of tool to another (a puff, then the new prop), with the
// same work going on, only harder (no opening at all), or with a celebration of what
// git just did: a flag waved for a commit, a snowball thrown up for a push, both for
// both.
export type Opening = 'start' | 'switch' | 'stay' | 'commit' | 'push' | 'ship'

// How hard the turn has worked so far, by how long it has run and how many tools it
// has called: the spark whirls faster and glows brighter at each step, and throws off
// embers at the top two.
export type Heat = 0 | 1 | 2 | 3

// What the person's prompt sounds like to the band, read as the turn starts: nothing
// typed (a turn that goes on by itself), a plain request, thanks or praise, a hurry, or
// a question.
export type Tone = 'none' | 'plain' | 'thanks' | 'urgent' | 'question'

// The work the band shows, how many helpers are out (the agents Claude sent off, still
// at work), how the turn's prompt sounded, how hard it works, and how many whole
// minutes it has run: a flag along the snow for each, up to ten.
export type Work = {
  activity: Activity
  opening: Opening
  helpers: number
  tone: Tone
  heat: Heat
  trek: number
}

// How deep the snow has drifted along the band: how full the conversation's context
// is, from none (under 30%) to deep (85% and over).
export type Drift = 0 | 1 | 2 | 3 | 4

// The snowman as far as it is built: a stage a day of use, from a snowball (1) to the
// whole of it with its top hat (6); and the gifts the answers have earned it, from none
// to all three (a scarf, a broom, a star on its hat).
export type Snowman = {
  stage: number
  gifts: number
}

// A focus session the person started with /winter focus: when it began and when it
// ends, by this machine's clock, and whether its bell is ringing, the time just up.
export type Focus = {
  startedAt: number
  endsAt: number
  isDone: boolean
}

declare module 'claude-code' {
  interface PluginState {
    winter: {
      beat: Beat | null
      motion: Motion
      when: When
      // Dozing: late at night, nothing asked of Claude for a while.
      isAsleep: boolean
      work: Work
      focus: Focus | null
      drift: Drift
      // The conversation is being compacted: the character shovels the snow away.
      isShoveling: boolean
      snowman: Snowman
    }
  }
}
