// The mod's sounds on any system. Claude Code's own `$.audio.play` plays a clip only
// where it knows the system's player (afplay, on macOS) and plays nothing elsewhere,
// so the mod starts a player itself: afplay on macOS; PowerShell's SoundPlayer, part of
// Windows; on Linux PipeWire's, PulseAudio's or ALSA's player, else one of the media
// players a desktop may carry. The first that plays is kept for the session. Where none
// will, the engine's own play is the last try.

import type { EngineInterface } from 'claude-code'

export type Sound = 'chime' | 'bell' | 'pop'
export type System = 'mac' | 'windows' | 'linux'

// How loud, of the clip's own loudness.
const VOLUME = 0.8

// How long a player may take: the longest sound is under two and a half seconds.
const PLAY_TIMEOUT_MS = 10_000

export type Player = { name: string; argv: (file: string) => string[] }

// PowerShell plays a WAV through .NET's SoundPlayer, part of Windows, and waits for it.
const soundPlayerOf = (file: string) => `(New-Object System.Media.SoundPlayer '${file.replace(/'/g, "''")}').PlaySync()`

// Each system's players, the likeliest first.
export const PLAYERS: Readonly<Record<System, readonly Player[]>> = {
  mac: [{ name: 'afplay', argv: file => ['afplay', '-v', String(VOLUME), file] }],
  windows: [
    {
      name: 'PowerShell',
      argv: file => ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', soundPlayerOf(file)],
    },
    { name: 'pwsh', argv: file => ['pwsh', '-NoProfile', '-NonInteractive', '-Command', soundPlayerOf(file)] },
  ],
  linux: [
    { name: 'pw-play', argv: file => ['pw-play', '--volume', String(VOLUME), file] },
    { name: 'paplay', argv: file => ['paplay', `--volume=${Math.round(VOLUME * 65536)}`, file] },
    { name: 'aplay', argv: file => ['aplay', '-q', file] },
    {
      name: 'ffplay',
      argv: file => ['ffplay', '-nodisp', '-autoexit', '-loglevel', 'quiet', '-volume', String(VOLUME * 100), file],
    },
    { name: 'mpv', argv: file => ['mpv', '--no-video', '--really-quiet', `--volume=${VOLUME * 100}`, file] },
    { name: 'play', argv: file => ['play', '-q', '-v', String(VOLUME), file] },
    { name: 'canberra-gtk-play', argv: file => ['canberra-gtk-play', '-f', file] },
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

// This session's system, and the player that has played here: none found yet
// (undefined), or none of them will (null).
let system: System | undefined
let player: Player | null | undefined

async function systemHere($: EngineInterface): Promise<System> {
  const root = $.plugin.root

  if (systemOf(root, undefined) === 'windows') {
    return 'windows'
  }
  try {
    const { stdout } = await $.process.run(['uname', '-s'], { timeoutMs: 5000 })

    return systemOf(root, stdout)
  } catch {
    return 'linux'
  }
}

/**
 * Plays `sound` with the first player that runs here, and says which played it: a
 * player's name, `Claude Code` for the engine's own, or `none`.
 */
export async function playSound($: EngineInterface, sound: Sound): Promise<string> {
  system ??= await systemHere($)

  const file = fileOf($.plugin.root, sound)
  const players = player === undefined ? PLAYERS[system] : player === null ? [] : [player]

  for (const one of players) {
    try {
      const { exitCode } = await $.process.run(one.argv(file), { timeoutMs: PLAY_TIMEOUT_MS })

      if (exitCode === 0) {
        player = one

        return one.name
      }
    } catch {
      // It cannot start here: the next one.
    }
  }
  // A player that played before and fails now is looked for again next time; with none
  // at all, they are not tried again this session.
  player = player === undefined ? null : undefined

  // The engine's own play: on macOS by afplay; elsewhere, as its docs say, nothing.
  try {
    await $.audio.play({ asset: `sounds/${sound}.wav` }, { gain: VOLUME })

    return system === 'mac' ? 'Claude Code' : 'none'
  } catch {
    return 'none'
  }
}

/** Forgets what was found, as a new session starts: another machine, another player. */
export function forgetPlayer(): void {
  system = undefined
  player = undefined
}
