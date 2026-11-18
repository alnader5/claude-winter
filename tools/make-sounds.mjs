// Writes the mod's sounds into sounds/: a soft two-note chime for an answer, a bell for
// the end of a focus session, and a small rising pop for a commit or a push. Each is
// worked out from sine waves here, so the files are the mod's own: 16-bit mono WAV at
// 22050 Hz. Run with: node tools/make-sounds.mjs

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RATE = 22050
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'sounds')

// A struck tone: partials of a frequency, each with its own loudness and decay, after a
// few milliseconds' attack so it starts without a click.
function struck(seconds, frequency, partials, start = 0) {
  return t => {
    const at = t - start

    if (at < 0) {
      return 0
    }
    const attack = Math.min(1, at / 0.004)

    return partials.reduce(
      (sum, [ratio, level, decay]) => sum + level * Math.exp(-at / decay) * Math.sin(2 * Math.PI * frequency * ratio * at),
      0,
    ) * attack * (at < seconds ? 1 : 0)
  }
}

// The samples of `seconds` of sound, from voices added together, faded out at the end.
function render(seconds, voices) {
  const count = Math.round(seconds * RATE)
  const samples = new Float64Array(count)

  for (let index = 0; index < count; index++) {
    const t = index / RATE
    const fade = Math.min(1, (seconds - t) / 0.05)

    samples[index] = voices.reduce((sum, voice) => sum + voice(t), 0) * fade
  }

  return samples
}

function wavOf(samples, loudness) {
  const peak = samples.reduce((top, value) => Math.max(top, Math.abs(value)), 1e-9)
  const data = Buffer.alloc(samples.length * 2)

  samples.forEach((value, index) => data.writeInt16LE(Math.round((value / peak) * loudness * 32767), index * 2))

  const head = Buffer.alloc(44)

  head.write('RIFF', 0)
  head.writeUInt32LE(36 + data.length, 4)
  head.write('WAVE', 8)
  head.write('fmt ', 12)
  head.writeUInt32LE(16, 16)
  head.writeUInt16LE(1, 20)
  head.writeUInt16LE(1, 22)
  head.writeUInt32LE(RATE, 24)
  head.writeUInt32LE(RATE * 2, 28)
  head.writeUInt16LE(2, 32)
  head.writeUInt16LE(16, 34)
  head.write('data', 36)
  head.writeUInt32LE(data.length, 40)

  return Buffer.concat([head, data])
}

// A bell's partials: its hum, its strike and the inharmonic ones over them.
const BELL = [
  [1, 1, 0.9],
  [2, 0.5, 0.6],
  [2.76, 0.35, 0.4],
  [5.4, 0.15, 0.25],
]

const SOUNDS = {
  // G5 then C6, lightly.
  chime: wavOf(
    render(1.1, [
      struck(1.1, 784, [
        [1, 1, 0.35],
        [2, 0.25, 0.2],
      ]),
      struck(1.1, 1046.5, [
        [1, 1, 0.45],
        [2, 0.25, 0.25],
      ], 0.14),
    ]),
    0.5,
  ),
  // A4, a bell's ring.
  bell: wavOf(render(2.2, [struck(2.2, 440, BELL)]), 0.6),
  // A quick rise, 500 to 1500 Hz, and gone.
  pop: wavOf(
    render(0.22, [
      t => {
        const phase = 2 * Math.PI * (500 * t + (1000 / (2 * 0.12)) * Math.min(t, 0.12) ** 2)

        return Math.sin(phase) * Math.exp(-t / 0.06) * Math.min(1, t / 0.003)
      },
    ]),
    0.45,
  ),
}

mkdirSync(OUT, { recursive: true })

for (const [name, wav] of Object.entries(SOUNDS)) {
  writeFileSync(join(OUT, `${name}.wav`), wav)
  console.log(`sounds/${name}.wav`, wav.length, 'bytes')
}
