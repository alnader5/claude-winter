// The backdrop: snow falling slowly over low hills, with a few pines in the corners.
//
// A hook cannot ask which mode the app is in, so the drawing has to read in both.
// Its own colors are mid tones that show on the snowy page and on the night sky
// alike. Where the frame reports the dark scheme, the flakes turn white and keep a
// thin gray-blue edge, so they still show if the app itself is in light mode.

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

// The viewBox is cut to fill any window and anchored at the foot, so the hills stay
// on the bottom edge. On a tall box, such as a phone, the corner pines move in.
export const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="xMidYMax slice">
<style>
  .flake { fill: #7f9bb8; animation-name: fall; animation-timing-function: linear; animation-iteration-count: infinite; }
  .far { opacity: 0.4; }
  .mid { opacity: 0.55; }
  .near { opacity: 0.7; }
  .hill-back { fill: #9fb4c9; opacity: 0.28; }
  .hill-front { fill: #b9c9da; opacity: 0.4; }
  .pine { fill: #5f7d92; opacity: 0.34; }
  @media (prefers-color-scheme: dark) {
    .flake { fill: #eef4fb; stroke: #6f8caa; stroke-width: 0.7; stroke-opacity: 0.6; }
    .hill-back { fill: #2f4258; opacity: 0.38; }
    .hill-front { fill: #3c526b; opacity: 0.42; }
    .pine { fill: #0b1119; opacity: 0.5; }
  }
  @keyframes fall {
    from { transform: translate(0, 0); }
    to { transform: translate(var(--drift), ${HEIGHT + 30}px); }
  }
  @media (max-aspect-ratio: 3/4) {
    .pines-left { transform: translateX(520px); }
    .pines-right { transform: translateX(-480px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .flake { animation: none; transform: translate(0, var(--rest)); }
  }
</style>
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

// The snowfall held still, as the person asks with /winter calm: each flake where it
// rests for reduced motion.
export const SCENE_CALM = SCENE.replace(
  '</style>',
  '  /* /winter calm */ .flake { animation: none; transform: translate(0, var(--rest)); }\n</style>',
)
