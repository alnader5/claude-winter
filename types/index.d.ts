// The turn the band above the prompt follows: under way ('working'), or how it just
// ended, until the band goes back to the chase. `turnId` is that turn's, so a timer
// left from one turn never clears the next one's beat.
export type Beat = {
  mood: 'working' | 'joy' | 'puzzled' | 'closing'
  turnId: string
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

declare module 'claude-code' {
  interface PluginState {
    winter: {
      beat: Beat | null
      motion: Motion
      when: When
      // Dozing: late at night, nothing asked of Claude for a while.
      isAsleep: boolean
    }
  }
}
