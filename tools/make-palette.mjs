// Writes hooks/palette.ts: the winter palette, as the definition makeColors takes.
//
//   node tools/make-palette.mjs
//
// The engine never loads this file. Run it after changing a number below, or after
// copying a newer make-colors.js into hooks/.
//
// How the palette is made: every color of the design system keeps its place in the
// contrast table. A gray takes the winter hue, a role takes its seed's hue, and each
// one's luminance moves by one factor per mode, Y' = k * (Y + 0.05) - 0.05, which
// leaves every WCAG ratio where the design system has it. A last pass mends the few
// pairs that 8-bit rounding leaves a hundredth short, so makeColors lists no problem.

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { makeColors } from '../hooks/make-colors.js'

// Under 1 deepens the snowy page of light mode; over 1 lifts the night sky of dark mode.
const DEPTH = { light: 0.9, dark: 1.12 }

// The hue every gray leans to (OKLCH degrees), and how far.
const TINT = { hue: 252, strength: 0.036 }

// One color per role: its hue and how vivid it is. The design system sets the lightness.
const SEEDS = { accent: '#3b7fb8', danger: '#b8423f', success: '#3f8068', warning: '#b07a1e', pro: '#6c5aa8' }

// Filled controls with a factor of their own, so the text on them stays the ink the
// design system pairs them with instead of falling to pure black: 1 keeps the design
// system's luminance, and the accent goes a little under it so white reads on it.
const OWN = {
  light: [[/^role-success-(400|450)$/, 1]],
  dark: [
    [/^role-(danger|pro)-(400|450)$/, 1],
    [/^role-accent-(400|450)$/, 0.94],
  ],
}

// The page, cards, panels and menus of each mode. The mending pass leaves them as
// they are while moving another color can do the job.
const SURFACES = { light: ['gray-0', 'gray-10', 'gray-20'], dark: ['gray-800', 'gray-830', 'gray-850', 'gray-900'] }

// --- color math: sRGB, OKLCH and WCAG luminance ---

const toLinear = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGamma = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

function channelsOf(hex) {
  const n = parseInt(hex.slice(1), 16)

  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => toLinear(v / 255))
}

function luminanceOf(hex) {
  const [r, g, b] = channelsOf(hex)

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function oklchOf(hex) {
  const [r, g, b] = channelsOf(hex)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s

  return {
    lightness: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    chroma: Math.hypot(a, bb),
    hue: (Math.atan2(bb, a) * 180) / Math.PI,
  }
}

function linearOf(lightness, chroma, hue) {
  const a = chroma * Math.cos((hue * Math.PI) / 180)
  const b = chroma * Math.sin((hue * Math.PI) / 180)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

// The nearest sRGB color: chroma gives way until the color fits.
function hexOf(lightness, chroma, hue) {
  let fitted = chroma

  for (let i = 0; i < 40; i++) {
    if (linearOf(lightness, fitted, hue).every(v => v >= -0.0005 && v <= 1.0005)) {
      break
    }
    fitted *= 0.95
  }

  return (
    '#' +
    linearOf(lightness, fitted, hue)
      .map(v => Math.round(toGamma(Math.min(1, Math.max(0, v))) * 255))
      .map(v => v.toString(16).padStart(2, '0'))
      .join('')
  )
}

// The color of this hue and chroma whose luminance is `luminance`.
function atLuminance(luminance, chroma, hue) {
  const target = Math.min(1, Math.max(0, luminance))
  let low = 0
  let high = 1

  for (let i = 0; i < 40; i++) {
    const middle = (low + high) / 2

    if (luminanceOf(hexOf(middle, chroma, hue)) < target) {
      low = middle
    } else {
      high = middle
    }
  }

  return hexOf((low + high) / 2, chroma, hue)
}

// --- the palette ---

const smooth = (from, to, x) => {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)))

  return t * t * (3 - 2 * t)
}

// A mode's factor fades out at its far end, so the ink there keeps the design
// system's luminance instead of running into pure black or pure white.
function movedLuminance(hex, k) {
  const y = luminanceOf(hex)
  const weight = k < 1 ? smooth(0.02, 0.06, y) : 1 - smooth(0.45, 0.8, y)

  return (1 + (k - 1) * weight) * (y + 0.05) - 0.05
}

// A gray's tint is strongest in the middle of the ramp and thins out toward both ends.
function tintOf(luminance) {
  const { lightness } = oklchOf(atLuminance(luminance, 0, TINT.hue))

  return TINT.strength * (4 * lightness * (1 - lightness)) ** 0.6
}

// The design system's own colors. A role's stock ramp comes from a theme that left it alone.
const stockButAccent = makeColors({ label: 'stock', roles: { accent: SEEDS.accent } }).theme.inputs
const stockAccent = makeColors({ label: 'stock', roles: { pro: SEEDS.pro } }).theme.inputs
const seeded = makeColors({ label: 'seeded', roles: SEEDS }).theme.inputs
const stockOf = (mode, name) => (name.startsWith('role-accent-') ? stockAccent : stockButAccent)[mode][name]
const NAMES = Object.keys(seeded.light).filter(name => /^(gray-\d+|role-\w+-\d+|text-git-\w+)$/.test(name))

function build(nudge) {
  const definition = { label: 'Winter' }

  for (const mode of ['light', 'dark']) {
    const stops = {}
    const roles = {}
    const git = {}

    for (const name of NAMES) {
      const stock = stockOf(mode, name)
      const k = OWN[mode].find(([pattern]) => pattern.test(name))?.[1] ?? DEPTH[mode]
      const luminance = (movedLuminance(stock, k) + 0.05) * (nudge[mode][name] ?? 1) - 0.05
      const [, role, stop] = /^role-(\w+)-(\d+)$/.exec(name) ?? []

      if (name.startsWith('gray-')) {
        stops[name.slice(5)] = atLuminance(luminance, tintOf(luminance), TINT.hue)
      } else if (role !== undefined) {
        const { chroma, hue } = oklchOf(seeded[mode][name])

        roles[role] ??= { stops: {} }
        roles[role].stops[stop] = atLuminance(luminance, chroma, hue)
      } else {
        const { chroma, hue } = oklchOf(stock)

        git[name.slice(9)] = atLuminance(luminance, chroma, hue)
      }
    }
    definition[mode] = { gray: { stops }, roles, git }
  }

  return definition
}

// How far the listed pairs are under their floors, all together.
function shortfallOf(problems) {
  return problems.reduce((sum, line) => {
    const found = /is ([\d.]+):1 in \w+ mode; it needs ([\d.]+):1/.exec(line)

    return sum + (found ? Number(found[2]) - Number(found[1]) + 0.02 : 1)
  }, 0)
}

// While a pair is under its floor, try moving each color's luminance a little either
// way, and keep the one move that closes the most of the shortfall.
function bestMove(nudge, problems, names) {
  let best = { shortfall: shortfallOf(problems) }

  for (const mode of ['light', 'dark']) {
    if (!problems.some(line => line.includes(`${mode} mode`))) {
      continue
    }
    for (const name of names(mode)) {
      for (const step of [0.975, 1.025]) {
        const trial = { light: { ...nudge.light }, dark: { ...nudge.dark } }

        trial[mode][name] = (trial[mode][name] ?? 1) * step

        const found = makeColors(build(trial)).problems
        const shortfall = shortfallOf(found)

        if (shortfall < best.shortfall - 1e-9) {
          best = { shortfall, mode, name, step, problems: found }
        }
      }
    }
  }

  return best
}

function mend() {
  const nudge = { light: {}, dark: {} }
  let problems = makeColors(build(nudge)).problems

  for (let round = 0; round < 80 && problems.length > 0; round++) {
    let best = bestMove(nudge, problems, mode => NAMES.filter(name => !SURFACES[mode].includes(name)))

    if (best.name === undefined) {
      best = bestMove(nudge, problems, mode => SURFACES[mode])
    }
    if (best.name === undefined) {
      break
    }
    nudge[best.mode][best.name] = (nudge[best.mode][best.name] ?? 1) * best.step
    problems = best.problems
    console.log(`mended ${best.mode} ${best.name} x${best.step}: ${problems.length} left`)
  }

  return { definition: build(nudge), problems }
}

// --- the file ---

const byNumber = record => Object.entries(record).sort(([a], [b]) => Number(a) - Number(b))

function tableOf(record, indent) {
  const cells = byNumber(record).map(([stop, hex]) => `${stop}: '${hex}'`)
  const rows = []

  for (let i = 0; i < cells.length; i += 6) {
    rows.push(`${indent}  ${cells.slice(i, i + 6).join(', ')},`)
  }

  return `{\n${rows.join('\n')}\n${indent}}`
}

function modeOf(half) {
  const roles = Object.entries(half.roles)
    .map(([role, { stops }]) => `      ${role}: { stops: ${tableOf(stops, '      ')} },`)
    .join('\n')
  const git = Object.entries(half.git)
    .map(([state, hex]) => `${state}: '${hex}'`)
    .join(', ')

  return `{
    gray: { stops: ${tableOf(half.gray.stops, '    ')} },
    roles: {
${roles}
    },
    git: { ${git} },
  }`
}

const { definition, problems } = mend()

if (problems.length > 0) {
  console.error(`${problems.length} pairs are still under their floors:\n${problems.join('\n')}`)
  process.exitCode = 1
}

const text = `// Written by tools/make-palette.mjs: change the numbers there and run it again,
// rather than editing a color here.
//
// A snowy day in light mode and a clear winter night in dark mode. Every gray leans
// to one cold blue, and each pair of colors keeps the contrast the design system
// gives it, so makeColors lists no problem for this palette.

import type { makeColors } from './make-colors.js'

export const WINTER: Parameters<typeof makeColors>[0] = {
  label: '${definition.label}',
  light: ${modeOf(definition.light)},
  dark: ${modeOf(definition.dark)},
}
`

writeFileSync(fileURLToPath(new URL('../hooks/palette.ts', import.meta.url)), text)

const { inputs } = makeColors(definition).theme

for (const mode of ['light', 'dark']) {
  const gray = definition[mode].gray.stops
  const surfaces = mode === 'light' ? [20, 10, 0] : [900, 850, 830, 800]
  const texts = mode === 'light' ? [900, 600, 400] : [50, 200, 400]
  const fills = Object.entries(inputs[mode])
    .filter(([name]) => /-(fill|on)$/.test(name))
    .map(([name, hex]) => `${name.slice(5)} ${hex}`)

  console.log(`${mode}: surfaces ${surfaces.map(s => gray[s]).join(' ')}; text ${texts.map(s => gray[s]).join(' ')}`)
  console.log(`${mode}: ${fills.join(', ')}`)
}
console.log(`wrote hooks/palette.ts; ${problems.length} problems`)
