// The backdrop: snow falling slowly over low hills, with a few pines in the corners,
// under a sky that follows the clock: a moon and twinkling stars at night, a low sun at
// dawn and at dusk. In Ramadan a crescent hangs in the sky, bright at night. Now and
// then on a clear night a star shoots across it, and more rarely the northern lights
// ripple over it a while.
//
// A hook cannot ask which mode the app is in, so the drawing has to read in both.
// Its own colors are mid tones that show on the snowy page and on the night sky
// alike. Where the frame reports the dark scheme, the flakes turn white and keep a
// thin gray-blue edge, so they still show if the app itself is in light mode.

import { textOf } from './markup'
import type { Occasion, Sky } from './time'

export const SCENE_NAME = 'snowfall'

export const SCENE_ALT = 'Snow falling slowly over low hills and pines'

const WIDTH = 1600
const HEIGHT = 1000

type Layer = {
  name: 'far' | 'mid' | 'near'
  count: number
  radius: readonly [number, number]
  seconds: readonly [number, number]
  seed: number
}

const LAYERS: readonly Layer[] = [
  { name: 'far', count: 40, radius: [1.4, 2.4], seconds: [30, 44], seed: 7 },
  { name: 'mid', count: 26, radius: [2.2, 3.6], seconds: [20, 30], seed: 19 },
  { name: 'near', count: 14, radius: [3.4, 5.2], seconds: [13, 20], seed: 43 },
]

// A small generator with a fixed seed, so the snowfall is the same on every load.
function randomFrom(seed: number): () => number {
  let state = seed

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296

    return state / 4294967296
  }
}

function flakesOf({ name, count, radius, seconds, seed }: Layer): string {
  const random = randomFrom(seed)
  const [minRadius, maxRadius] = radius
  const [minSeconds, maxSeconds] = seconds
  let flakes = ''

  for (let index = 0; index < count; index++) {
    const x = Math.round(random() * WIDTH)
    const r = (minRadius + random() * (maxRadius - minRadius)).toFixed(1)
    const duration = minSeconds + random() * (maxSeconds - minSeconds)
    // A negative delay starts each flake part of the way down its fall.
    const delay = random() * duration
    const drift = Math.round(-60 + random() * 120)
    // Where the flake rests when the person asks for reduced motion.
    const rest = Math.round(40 + random() * (HEIGHT - 240))
    const style = `--drift:${drift}px;--rest:${rest}px;animation-duration:${duration.toFixed(1)}s;animation-delay:-${delay.toFixed(1)}s`

    flakes += `<circle class="flake ${name}" cx="${x}" cy="-10" r="${r}" style="${style}"/>`
  }

  return flakes
}

// Stars over the sky: four-pointed, scattered where a wide window or a phone still shows
// them, each twinkling on a beat of its own.
function starsOf(): string {
  const random = randomFrom(71)
  let stars = ''

  for (let index = 0; index < 28; index++) {
    const x = Math.round(80 + random() * (WIDTH - 160))
    const y = Math.round(240 + random() * 400)
    const size = (0.6 + random() * 0.8).toFixed(2)
    const beat = (2.4 + random() * 3).toFixed(1)
    const delay = (random() * 4).toFixed(1)

    stars +=
      `<path class="star" transform="translate(${x} ${y}) scale(${size})" ` +
      `d="M0-8L1.8-1.8L8 0L1.8 1.8L0 8L-1.8 1.8L-8 0L-1.8-1.8Z" style="animation-duration:${beat}s;animation-delay:-${delay}s"/>`
  }

  return stars
}

// The moon, the sun and the crescent stand right of the middle or left of it, where a
// phone's narrow cut of the scene still shows them.
const MOON = { x: 1010, y: 360 }

// A crescent: the left half of a disc, less a flatter arc of a larger one.
function crescentOf(r: number, opacity: number): string {
  const { x, y } = MOON

  return `<path fill="#e9c96b" fill-opacity="${opacity}" d="M${x} ${y - r}A${r} ${r} 0 0 0 ${x} ${y + r}A${r * 1.25} ${r * 1.25} 0 0 1 ${x} ${y - r}Z"/>`
}

// Two shooting stars, each on a beat of its own: where it starts, how often it comes,
// and how long into the night it first does.
const SHOOTING: readonly (readonly [number, number, number, number])[] = [
  [1250, 260, 97, 40],
  [720, 300, 151, 100],
]

// The northern lights: two ribbons over the top of the sky, swaying while they show,
// for under a minute every seven, the first after two and a half.
const AURORA =
  '<g class="aurora">' +
  '<path fill="url(#aurora)" d="M-100 140 C 250 60 500 220 800 130 C 1100 40 1350 200 1700 110 L 1700 330 C 1350 420 1100 260 800 350 C 500 440 250 280 -100 360 Z"/>' +
  '<path fill="url(#aurora-violet)" d="M-100 200 C 300 120 600 280 900 190 C 1200 100 1400 250 1700 170 L 1700 300 C 1400 380 1200 240 900 320 C 600 400 300 250 -100 330 Z"/>' +
  '</g>'

// What the night sky brings now and then; nothing when the person asks for calm.
function visitorsOf(calm: boolean): string {
  if (calm) {
    return ''
  }
  const stars = SHOOTING.map(
    ([x, y, every, first]) =>
      `<g class="shoot" style="--x:${x}px;--y:${y}px;animation-duration:${every}s;animation-delay:${first}s">` +
      '<line x1="0" y1="0" x2="80" y2="-40" stroke="url(#tail)" stroke-width="3" stroke-linecap="round"/></g>',
  ).join('')

  return AURORA + stars
}

// What the sky holds, drawn behind the hills so a low sun sinks into them.
function skyOf(sky: Sky, occasion: Occasion, calm: boolean): string {
  const isRamadan = occasion === 'ramadan'
  const halo = `<circle cx="${MOON.x}" cy="${MOON.y}" r="96" fill="url(#halo)"/>`

  if (sky === 'night') {
    const moon = isRamadan ? crescentOf(44, 1) : `<circle cx="${MOON.x}" cy="${MOON.y}" r="36" fill="#f2e6b6"/>`

    return `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#night)"/>${visitorsOf(calm)}${starsOf()}${halo}${moon}`
  }
  // By day the crescent of Ramadan stays, faint.
  const hilal = isRamadan ? crescentOf(44, 0.5) : ''

  if (sky === 'day') {
    return hilal
  }
  const sun = sky === 'dawn' ? { x: 620, fill: '#f9cf73' } : { x: 980, fill: '#f6a560' }

  return (
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#${sky})"/>${hilal}` +
    `<circle cx="${sun.x}" cy="905" r="88" fill="url(#sun)"/><circle cx="${sun.x}" cy="905" r="44" fill="${sun.fill}"/>`
  )
}

/**
 * The backdrop for a sky and an occasion. `calm`, as the person asks with /winter calm,
 * holds it still: each flake where it rests for reduced motion, and the stars unlit by
 * twinkling.
 */
export function sceneOf({
  sky = 'day',
  occasion = 'none',
  calm = false,
}: { sky?: Sky; occasion?: Occasion; calm?: boolean } = {}): string {
  const still = calm
    ? '  /* /winter calm */ .flake { animation: none; transform: translate(0, var(--rest)); } .star { animation: none; }\n'
    : ''

  const style = `
  .flake { fill: #7f9bb8; animation-name: fall; animation-timing-function: linear; animation-iteration-count: infinite; }
  .far { opacity: 0.4; }
  .mid { opacity: 0.55; }
  .near { opacity: 0.7; }
  .hill-back { fill: #9fb4c9; opacity: 0.28; }
  .hill-front { fill: #b9c9da; opacity: 0.4; }
  .pine { fill: #5f7d92; opacity: 0.34; }
  .star { fill: #d2b960; opacity: 0.8; animation-name: twinkle; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
  .shoot { opacity: 0; transform: translate(var(--x), var(--y)); animation-name: shoot; animation-timing-function: linear; animation-iteration-count: infinite; }
  .tail-head { stop-color: #c9a53f; stop-opacity: 0.9; }
  .tail-end { stop-color: #c9a53f; stop-opacity: 0; }
  .aurora { --glow: 0.45; opacity: 0; animation: aurora 420s ease-in-out 150s infinite; }
  @media (prefers-color-scheme: dark) {
    .tail-head { stop-color: #fff8dd; }
    .tail-end { stop-color: #fff8dd; }
    .aurora { --glow: 0.85; }
  }
  @media (prefers-color-scheme: dark) {
    .flake { fill: #eef4fb; stroke: #6f8caa; stroke-width: 0.7; stroke-opacity: 0.6; }
    .hill-back { fill: #2f4258; opacity: 0.38; }
    .hill-front { fill: #3c526b; opacity: 0.42; }
    .pine { fill: #0b1119; opacity: 0.5; }
    .star { fill: #f1e3a6; }
  }
  @keyframes fall {
    from { transform: translate(0, 0); }
    to { transform: translate(var(--drift), ${HEIGHT + 30}px); }
  }
  @keyframes twinkle {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }
  @keyframes shoot {
    0% { opacity: 0; transform: translate(var(--x), var(--y)); }
    0.2% { opacity: 1; }
    1.1% { opacity: 1; transform: translate(calc(var(--x) - 420px), calc(var(--y) + 210px)); }
    1.4%, 100% { opacity: 0; transform: translate(calc(var(--x) - 470px), calc(var(--y) + 235px)); }
  }
  @keyframes aurora {
    0% { opacity: 0; transform: translateX(0) skewX(0deg); }
    2% { opacity: var(--glow); }
    5% { transform: translateX(-30px) skewX(-4deg); }
    8% { transform: translateX(20px) skewX(3deg); }
    10% { opacity: var(--glow); }
    12%, 100% { opacity: 0; transform: translateX(0) skewX(0deg); }
  }
  @media (max-aspect-ratio: 3/4) {
    .pines-left { transform: translateX(520px); }
    .pines-right { transform: translateX(-480px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .flake { animation: none; transform: translate(0, var(--rest)); }
    .star { animation: none; }
    .shoot, .aurora { animation: none; }
  }
${still}`

  // The viewBox is cut to fill any window and anchored at the foot, so the hills stay on
  // the bottom edge. On a tall box, such as a phone, the corner pines move in. The style
  // is escaped as the band's is, so it reads the same however the app parses it.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="xMidYMax slice">
<style>${textOf(style)}</style>
<defs>
  <linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2a4a" stop-opacity="0.3"/><stop offset="0.75" stop-color="#1b2a4a" stop-opacity="0"/></linearGradient>
  <linearGradient id="dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0.35" stop-color="#f7b58f" stop-opacity="0"/><stop offset="0.92" stop-color="#f7b58f" stop-opacity="0.38"/></linearGradient>
  <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a6bb3" stop-opacity="0.16"/><stop offset="0.5" stop-color="#8a6bb3" stop-opacity="0"/><stop offset="0.92" stop-color="#f08f6a" stop-opacity="0.38"/></linearGradient>
  <radialGradient id="halo"><stop offset="0.3" stop-color="#f2e6b6" stop-opacity="0.45"/><stop offset="1" stop-color="#f2e6b6" stop-opacity="0"/></radialGradient>
  <radialGradient id="sun"><stop offset="0.4" stop-color="#f9cf73" stop-opacity="0.5"/><stop offset="1" stop-color="#f9cf73" stop-opacity="0"/></radialGradient>
  <linearGradient id="tail" x1="0" y1="0" x2="1" y2="0"><stop class="tail-head" offset="0"/><stop class="tail-end" offset="1"/></linearGradient>
  <linearGradient id="aurora" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#58e0a0" stop-opacity="0"/><stop offset="0.4" stop-color="#58e0a0" stop-opacity="0.55"/><stop offset="0.7" stop-color="#4cc3d9" stop-opacity="0.3"/><stop offset="1" stop-color="#4cc3d9" stop-opacity="0"/></linearGradient>
  <linearGradient id="aurora-violet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9b7be0" stop-opacity="0"/><stop offset="0.5" stop-color="#9b7be0" stop-opacity="0.35"/><stop offset="1" stop-color="#58e0a0" stop-opacity="0"/></linearGradient>
</defs>
${skyOf(sky, occasion, calm)}
<path class="hill-back" d="M0 900 C 220 820 420 860 640 910 C 900 965 1150 850 1600 890 L 1600 1000 L 0 1000 Z"/>
<path class="hill-front" d="M0 950 C 260 890 480 940 760 965 C 1080 990 1320 920 1600 945 L 1600 1000 L 0 1000 Z"/>
<g class="pine pines-left">
  <path d="M90 940 l28 -70 l-12 0 l22 -52 l-10 0 l20 -48 l20 48 l-10 0 l22 52 l-12 0 l28 70 Z"/>
  <path d="M200 955 l20 -50 l-9 0 l16 -38 l-7 0 l14 -34 l14 34 l-7 0 l16 38 l-9 0 l20 50 Z"/>
</g>
<g class="pine pines-right">
  <path d="M1400 950 l24 -60 l-10 0 l19 -45 l-9 0 l17 -41 l17 41 l-9 0 l19 45 l-10 0 l24 60 Z"/>
  <path d="M1500 940 l30 -76 l-13 0 l24 -56 l-11 0 l22 -52 l22 52 l-11 0 l24 56 l-13 0 l30 76 Z"/>
</g>
${LAYERS.map(flakesOf).join('')}
</svg>`
}

// The plain day's snowfall, and the same held still.
export const SCENE = sceneOf()
export const SCENE_CALM = sceneOf({ calm: true })
