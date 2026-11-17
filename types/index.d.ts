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

declare module 'claude-code' {
  interface PluginState {
    winter: { beat: Beat | null; motion: Motion }
  }
}
