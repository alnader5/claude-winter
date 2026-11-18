// What a shell command did in git, for the band to celebrate: a commit, a push, or
// both in one go ("ship").

export type Cheer = 'commit' | 'push' | 'ship'

// The parts of a command line run one after another: split at &&, ||, ;, | and new
// lines. A quoted message holding one of these may be split too; its pieces do not
// start with git, so they count for nothing.
const PARTS = /&&|\|\||[;|\n]/

// git, after any VAR=value settings, with its own options (-C dir, -c key=value,
// --flag), then the command. A dry run (a push's -n too; a commit's -n skips its hooks)
// does nothing to celebrate.
const GIT = /^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*git(?:\s+(?:-[Cc]\s+\S+|--[a-z-]+(?:=\S+)?))*\s+(commit|push)\b/

/** What `command` does in git that the band celebrates, if anything. */
export function cheerOf(command: string): Cheer | undefined {
  let commit = false
  let push = false

  for (const part of command.split(PARTS)) {
    const line = part.trim()
    const match = GIT.exec(line)

    if (match === null || /\s--dry-run\b/.test(line) || (match[1] === 'push' && /\s-n\b/.test(line))) {
      continue
    }
    if (match[1] === 'push') {
      push = true
    } else {
      commit = true
    }
  }

  return commit && push ? 'ship' : push ? 'push' : commit ? 'commit' : undefined
}

/** Two cheers waiting together: a commit and a push make a ship. */
export function bothOf(first: Cheer | undefined, second: Cheer): Cheer {
  return first === undefined || first === second ? second : 'ship'
}
