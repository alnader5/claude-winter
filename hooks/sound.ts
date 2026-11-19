// The mod's sounds on any system. Claude Code's own `$.audio.play` plays a clip only
// through afplay, so only on macOS. The mod starts a player itself instead, the way
// Claude Code starts any process: with no shell, and on Windows with no window. On
// macOS, afplay. On Windows, .NET's SoundPlayer through PowerShell, both part of
// Windows. On Linux, PipeWire's, PulseAudio's or ALSA's player, else a media player the
// desktop has; and under WSL, with none of those, Windows' own player across the
// border. The first that plays is kept for the session.
//
// The sounds are made at the loudness they play at, so each player plays them at its
// own full volume, and they sound the same with every player.

import type { EngineInterface } from 'claude-code'

export type Sound = 'chime' | 'bell' | 'pop'
export type System = 'mac' | 'windows' | 'linux'

export type Player = {
  name: string
  // The command, given the sound's path.
  argv: (file: string) => string[]
  // Variables for the command, given the sound's path.
  env?: (file: string) => Record<string, string>
  // Windows' own player run from WSL: it reads the sound by its Windows name.
  isAcrossWsl?: boolean
}

// How long a player may take: the longest sound is under two and a half seconds, and
// PowerShell can take a second or two to start.
const PLAY_TIMEOUT_MS = 10_000

// How long a quick look may take: the system's name, a path's Windows name.
const LOOK_TIMEOUT_MS = 5000

// With no player found, how long before the search is made again: one may have been
// installed, or the sound server started, meanwhile.
export const RETRY_AFTER_MS = 10 * 60_000

// PowerShell plays the WAV through .NET's SoundPlayer and waits for it to end, or exits
// 1. The path comes in a variable, never in the command, so no character in it needs
// quoting; WSLENV lets the variable cross over to Windows when the command runs in WSL.
export const PLAY_WAV = 'try { (New-Object System.Media.SoundPlayer $env:WINTER_SOUND).PlaySync() } catch { exit 1 }'

const POWERSHELL_ARGS = ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', PLAY_WAV]

const powershellAt = (command: string, name = 'PowerShell'): Player => ({
  name,
  argv: () => [command, ...POWERSHELL_ARGS],
  env: file => ({ WINTER_SOUND: file, WSLENV: 'WINTER_SOUND' }),
})

const acrossWsl = (command: string): Player => ({ ...powershellAt(command, 'PowerShell (WSL)'), isAcrossWsl: true })

// Each system's players, the likeliest first.
export const PLAYERS: Readonly<Record<System, readonly Player[]>> = {
  mac: [{ name: 'afplay', argv: file => ['afplay', file] }],
  windows: [
    powershellAt('powershell.exe'),
    // Where PATH has lost it: where Windows keeps it.
    powershellAt('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'),
    powershellAt('pwsh.exe', 'pwsh'),
  ],
  linux: [
    { name: 'pw-play', argv: file => ['pw-play', file] },
    { name: 'paplay', argv: file => ['paplay', file] },
    { name: 'aplay', argv: file => ['aplay', '-q', file] },
    { name: 'ffplay', argv: file => ['ffplay', '-nodisp', '-autoexit', '-loglevel', 'quiet', file] },
    { name: 'mpv', argv: file => ['mpv', '--no-video', '--really-quiet', file] },
    { name: 'gst-play-1.0', argv: file => ['gst-play-1.0', '--no-interactive', '-q', file] },
    { name: 'cvlc', argv: file => ['cvlc', '--play-and-exit', '--quiet', file] },
    { name: 'play', argv: file => ['play', '-q', file] },
    { name: 'canberra-gtk-play', argv: file => ['canberra-gtk-play', '-f', file] },
    // Under WSL with none of those: Windows' own, by name, and by where Windows keeps it.
    acrossWsl('powershell.exe'),
    acrossWsl('/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe'),
  ],
}

/** The system a plugin folder at `root` is on, with `kernel` as `uname -s` named it. */
export function systemOf(root: string, kernel: string | undefined): System {
  if (/^[A-Za-z]:[\\/]/.test(root) || root.includes('\\')) {
    return 'windows'
  }

  return kernel?.trim() === 'Darwin' ? 'mac' : 'linux'
}

/** Where `sound` is on disk, in the plugin folder at `root`, in the folder's own style. */
export function fileOf(root: string, sound: Sound): string {
  const separator = root.includes('\\') && !root.includes('/') ? '\\' : '/'
  // The sounds sit beside the folder that holds plugin.json, if that is the one named.
  const base = root.replace(/[\\/]+$/, '').replace(/[\\/]\.claude-plugin$/, '')

  return `${base}${separator}sounds${separator}${sound}.wav`
}

// What this session has found: its system and what its players need to reach the
// sound server; the player that plays here; or since when none would.
type Here = { system: System; env: Record<string, string> }

let here: Here | undefined
let player: Player | undefined
let noneSince: number | undefined

// Where a Linux player finds the sound server: by XDG_RUNTIME_DIR, which a desktop
// session sets. Started without it (by sudo, or by a service), Claude Code's players
// are pointed at the user's own.
async function soundServerEnv($: EngineInterface): Promise<Record<string, string>> {
  try {
    if ((await $.env.get('XDG_RUNTIME_DIR')) !== undefined) {
      return {}
    }
    const { exitCode, stdout } = await $.process.run(['id', '-u'], { cwd: $.plugin.root, timeoutMs: LOOK_TIMEOUT_MS })
    const uid = stdout.trim()

    return exitCode === 0 && /^\d+$/.test(uid) ? { XDG_RUNTIME_DIR: `/run/user/${uid}` } : {}
  } catch {
    return {}
  }
}

async function lookAround($: EngineInterface): Promise<Here> {
  const root = $.plugin.root

  if (systemOf(root, undefined) === 'windows') {
    return { system: 'windows', env: {} }
  }
  let kernel: string | undefined

  try {
    kernel = (await $.process.run(['uname', '-s'], { cwd: root, timeoutMs: LOOK_TIMEOUT_MS })).stdout
  } catch {
    kernel = undefined
  }
  const system = systemOf(root, kernel)

  return { system, env: system === 'linux' ? await soundServerEnv($) : {} }
}

// A WSL path by its Windows name (\\wsl.localhost\<distro>\...), as wslpath gives it.
// Outside WSL there is no wslpath, and this rejects.
async function windowsNameOf($: EngineInterface, file: string): Promise<string> {
  const { exitCode, stdout } = await $.process.run(['wslpath', '-w', file], {
    cwd: $.plugin.root,
    timeoutMs: LOOK_TIMEOUT_MS,
  })
  const name = stdout.trim()

  if (exitCode !== 0 || name === '') {
    throw new Error(`wslpath: no Windows name for ${file}`)
  }

  return name
}

// Whether `one` played `file` through to its end.
async function played($: EngineInterface, one: Player, file: string, env: Record<string, string>): Promise<boolean> {
  try {
    const path = one.isAcrossWsl === true ? await windowsNameOf($, file) : file
    const vars = { ...env, ...one.env?.(path) }
    const { exitCode } = await $.process.run(one.argv(path), {
      // The plugin's own folder, which is there whatever became of the session's.
      cwd: $.plugin.root,
      ...(Object.keys(vars).length > 0 ? { env: vars } : {}),
      timeoutMs: PLAY_TIMEOUT_MS,
    })

    return exitCode === 0
  } catch {
    return false
  }
}

/**
 * Plays `sound` with the player that plays here, found by trying each in turn, and
 * says which played it: a player's name, `Claude Code` for its own play on macOS, or
 * `none`. With none found, the search waits a while before it is made again.
 */
export async function playSound($: EngineInterface, sound: Sound): Promise<string> {
  here ??= await lookAround($)

  const file = fileOf($.plugin.root, sound)

  if (player !== undefined) {
    if (await played($, player, file, here.env)) {
      return player.name
    }
    // The one that played here fails now: look again, at once.
    player = undefined
    noneSince = undefined
  }
  const now = await $.clock.now()

  if (noneSince === undefined || now - noneSince >= RETRY_AFTER_MS) {
    for (const one of PLAYERS[here.system]) {
      if (await played($, one, file, here.env)) {
        player = one
        noneSince = undefined

        return one.name
      }
    }
    noneSince = now
  }

  // Claude Code's own play: by afplay on macOS; on any other system it plays nothing.
  try {
    await $.audio.play({ asset: `sounds/${sound}.wav` })

    return here.system === 'mac' ? 'Claude Code' : 'none'
  } catch {
    return 'none'
  }
}

/** Forgets what was found: as a session starts, and as /winter sound on looks again. */
export function forgetPlayer(): void {
  here = undefined
  player = undefined
  noneSince = undefined
}
