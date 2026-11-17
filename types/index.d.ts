// The turn the band above the prompt follows: under way ('working'), or how it just
// ended, until the band goes back to the chase. `turnId` is that turn's, so a timer
// left from one turn never clears the next one's beat. `heat` is how hard the turn
// worked, by its end: a hard one ends in fireworks.
export type Beat = {
  mood: 'working' | 'joy' | 'puzzled' | 'closing'
  turnId: string
  heat: Heat
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
// switching from one kind of tool to another (a puff, then the new prop), or with the
// same work going on, only harder (no opening at all).
export type Opening = 'start' | 'switch' | 'stay'

// How hard the turn has worked so far, by how long it has run and how many tools it
// has called: the spark whirls faster and glows brighter at each step, and throws off
// embers at the top two.
export type Heat = 0 | 1 | 2 | 3

// What the person's prompt sounds like to the band, read as the turn starts: nothing
// typed (a turn that goes on by itself), a plain request, thanks or praise, a hurry, or
// a question.
export type Tone = 'none' | 'plain' | 'thanks' | 'urgent' | 'question'

// The work the band shows, how many helpers are out (the agents Claude sent off, still
// at work), and how the turn's prompt sounded.
export type Work = {
  activity: Activity
  opening: Opening
  helpers: number
  tone: Tone
  heat: Heat
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
    }
  }
}
