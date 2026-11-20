// Renders the pictures of the README from the mod's own drawings: the band and the
// backdrop exactly as the mod draws them, each moment frozen at its time, framed in a
// plain window with the conversation shown as gray lines. Chromium renders them; the
// animations are written by ffmpeg.
//
// Usage: node make-shots.mjs <mod folder> <out folder>
// Needs: chromium and ffmpeg on the PATH.

import { spawn, execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { tmpdir } from 'node:os'
import { extname, join, resolve } from 'node:path'

registerHooks({
  resolve: (specifier, context, next) =>
    /^\.\.?\//.test(specifier) && !/\.\w+$/.test(specifier) ? next(`${specifier}.ts`, context) : next(specifier, context),
})

const [mod, outArg] = process.argv.slice(2)
const out = resolve(outArg ?? 'out')
const band = await import(resolve(mod, 'hooks/band.ts'))
const { sceneOf } = await import(resolve(mod, 'hooks/scene.ts'))
const sprite = await import(resolve(mod, 'hooks/sprite.ts'))
const { bandOf, FPS } = band

const site = mkdtempSync(join(tmpdir(), 'winter-shots-'))
const frames = join(site, 'frames')

mkdirSync(out, { recursive: true })
mkdirSync(frames, { recursive: true })

const at = frame => (frame + 0.5) / FPS
const put = (name, text) => writeFileSync(join(site, name), text)

// The two looks of the window around the drawings: the mod's snowy day and winter night.
const LOOKS = {
  light: { page: '#edf4fb', card: 'rgba(244,248,252,0.64)', you: 'rgba(199,215,231,0.72)', line: 'rgba(112,129,148,0.42)', edge: 'rgba(112,129,148,0.28)', send: '#3f83bc' },
  dark: { page: '#0f1a26', card: 'rgba(21,33,45,0.64)', you: 'rgba(28,64,97,0.72)', line: 'rgba(160,175,192,0.34)', edge: 'rgba(160,175,192,0.22)', send: '#4287bf' },
}

// A window: the backdrop behind it, the conversation as frosted cards of gray lines, and
// the band above the prompt box, as wide as the box.
function windowPage(name, look, scene, bandFile) {
  const c = LOOKS[look]
  const lines = widths => widths.map(w => `<i style="width:${w}%"></i>`).join('')

  put(
    name,
    `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:${c.page};overflow:hidden;font:14px system-ui}
iframe{border:0;display:block}
.scene{position:fixed;inset:0;width:100%;height:100%}
main{position:relative;width:520px;margin:0 auto;height:100%;display:flex;flex-direction:column}
.chat{flex:1;display:flex;flex-direction:column;gap:12px;padding-top:26px}
.card{background:${c.card};backdrop-filter:blur(4px);border:1px solid ${c.edge};border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:9px}
.you{align-self:flex-end;width:58%;background:${c.you}}
.card i{display:block;height:8px;border-radius:4px;background:${c.line}}
.dock{padding-bottom:22px}
.band{width:520px;height:36px}
.box{height:74px;margin-top:2px;background:${c.card};backdrop-filter:blur(4px);border:1px solid ${c.edge};border-radius:16px;position:relative}
.box i{position:absolute;left:16px;top:16px;width:34%;height:8px;border-radius:4px;background:${c.line}}
.box b{position:absolute;right:12px;bottom:12px;width:28px;height:28px;border-radius:50%;background:${c.send}}
</style>
<iframe class="scene" id="scene" src="${scene}"></iframe>
<main><div class="chat">
<div class="card you">${lines([92, 64])}</div>
<div class="card">${lines([96, 88, 93, 71, 46])}</div>
<div class="card you">${lines([86, 52])}</div>
</div><div class="dock"><iframe class="band" id="band" src="${bandFile}"></iframe><div class="box"><i></i><b></b></div></div></main>`,
  )
}

// A board of moments: each a caption, in English and in Arabic, over the band drawn at
// 480 pixels, as wide as it runs on a desktop, and shown twice its size.
function boardPage(name, title, arabic, rows) {
  const row = ({ id, en, ar, file }) =>
    `<div class="row"><div class="say"><b>${en}</b><div dir="rtl">${ar}</div></div>` +
    `<iframe id="${id}" src="${file}"></iframe></div>`

  put(
    name,
    `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;background:#dfe9f4;font:15px/1.4 system-ui,'Noto Sans Arabic',sans-serif;color:#15212d}
body{padding:14px 16px 4px;width:1016px;box-sizing:border-box}
h1{font-size:18px;margin:0 4px 10px;display:flex;justify-content:space-between}
.row{background:#edf4fb;border-radius:12px;padding:8px 12px 10px;margin-bottom:10px}
.say{display:flex;justify-content:space-between;align-items:baseline;margin:0 2px 4px}
.say b{font-weight:600}
.say div{color:#3c4b5d}
iframe{border:0;display:block;width:480px;height:36px;zoom:2}
</style><h1><span>${title}</span><span dir="rtl">${arabic}</span></h1>${rows.map(row).join('')}`,
  )
}

// The snowman as it is built over the days, six of them in a row on the band's snow, as
// the band draws each: a part a day, a scarf, a broom and a star with the answers.
function snowmenOf() {
  const { pathOf, SNOWMAN, SNOWMAN_PARTS: parts, SNOWMAN_GIFTS: gifts, SNOWMAN_ARMS: arms } = sprite
  const path = (rects, fill) => `<path fill="${fill}" d="${pathOf(rects)}"/>`
  const top = band.TOP
  let men = ''

  ;[0, 1, 1, 2, 2, 3].forEach((given, index) => {
    const stage = index + 1
    const part = (rects, fill, from) => (stage >= from ? path(rects, fill) : '')
    const gift = (rects, fill, count, from = 1) => (given >= count && stage >= from ? path(rects, fill) : '')

    men +=
      `<g transform="translate(${30 + index * 80} ${top})">` +
      gift(gifts.broomStick, sprite.STICK, 2) +
      gift(gifts.broomStraw, sprite.STRAW, 2) +
      part(parts.body, sprite.SNOW_WHITE, 1) +
      part(parts.bodyShade, sprite.SNOW_SHADE, 1) +
      part(parts.head, sprite.SNOW_WHITE, 2) +
      part(parts.headShade, sprite.SNOW_SHADE, 2) +
      part(parts.face, sprite.COAL, 3) +
      part(SNOWMAN.carrot, sprite.CARROT, 4) +
      part(parts.hat, sprite.COAL, 6) +
      gift(gifts.scarf, sprite.KNIT_RED, 1, 2) +
      gift(gifts.scarfStripe, sprite.STRIPE, 1, 2) +
      gift(gifts.star, sprite.PARTY_GOLD, 3, 6) +
      (stage >= 5 ? path(arms.rest, sprite.STICK) : '') +
      '</g>'
  })

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="36" shape-rendering="crispEdges">' +
    '<rect x="0" y="34" width="480" height="1" fill="#a9bccf"/><rect x="0" y="35" width="480" height="1" fill="#eef4fb"/>' +
    `${men}</svg>`
  )
}

// A strip: the band alone at 480 pixels on the light page, for the animations.
function stripPage(name, file) {
  put(
    name,
    `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#edf4fb}iframe{border:0;display:block;width:480px;height:36px}</style><iframe id="band" src="${file}"></iframe>`,
  )
}

// What goes on the band and the backdrop, by name.
const SNOWMAN = { stage: 6, gifts: 3 }
const work = (activity, opening, extra = {}) => ({ activity, opening, helpers: 0, tone: 'plain', heat: 0, trek: 0, ...extra })
const svgs = {
  'scene-day.svg': sceneOf({ sky: 'day' }),
  'scene-night.svg': sceneOf({ sky: 'night' }),
  'idle.svg': bandOf('idle', { drift: 1, snowman: { stage: 6, gifts: 2 } }),
  'night.svg': bandOf('working', { drift: 2, snowman: SNOWMAN, work: work('edit', 'stay', { helpers: 2, heat: 2, trek: 3 }) }),
  'plane.svg': bandOf('working', { snowman: SNOWMAN, work: work('think', 'start') }),
  'thanks.svg': bandOf('working', { snowman: SNOWMAN, work: work('think', 'start', { tone: 'thanks' }) }),
  'question.svg': bandOf('working', { snowman: SNOWMAN, work: work('think', 'start', { tone: 'question' }) }),
  'urgent.svg': bandOf('working', { snowman: SNOWMAN, work: work('think', 'start', { tone: 'urgent' }) }),
  'bell.svg': bandOf('bell', { snowman: SNOWMAN }),
  'think.svg': bandOf('working', { snowman: SNOWMAN, work: work('think', 'stay') }),
  'edit.svg': bandOf('working', { snowman: SNOWMAN, work: work('edit', 'stay', { heat: 1 }) }),
  'read.svg': bandOf('working', { snowman: SNOWMAN, work: work('read', 'stay') }),
  'run.svg': bandOf('working', { snowman: SNOWMAN, work: work('run', 'stay') }),
  'web.svg': bandOf('working', { snowman: SNOWMAN, work: work('web', 'stay') }),
  'wait.svg': bandOf('working', { snowman: SNOWMAN, work: work('wait', 'stay') }),
  'helpers.svg': bandOf('working', { snowman: SNOWMAN, work: work('think', 'stay', { helpers: 3, heat: 3 }) }),
  'commit.svg': bandOf('working', { snowman: SNOWMAN, work: work('think', 'commit') }),
  'push.svg': bandOf('working', { snowman: SNOWMAN, work: work('think', 'push') }),
  'onward.svg': bandOf('working', { snowman: SNOWMAN, work: work('think', 'onward', { trek: 5 }) }),
  'summit.svg': bandOf('joy', { snowman: SNOWMAN, grand: true, trek: 6 }),
  'shovel.svg': bandOf('shovel', { drift: 3, snowman: SNOWMAN }),
  'focus.svg': bandOf('focus', { snowman: SNOWMAN, focus: { totalMs: 25 * 60_000, elapsedMs: 11 * 60_000 } }),
  'sleep.svg': bandOf('sleep', { snowman: SNOWMAN }),
  'newyear.svg': bandOf('idle', { occasion: 'newyear', snowman: SNOWMAN }),
  'ramadan.svg': bandOf('idle', { occasion: 'ramadan', snowman: SNOWMAN }),
  'joy.svg': bandOf('joy', { snowman: SNOWMAN, grand: true }),
  'switch-edit.svg': bandOf('working', { snowman: SNOWMAN, work: work('edit', 'switch', { tone: 'thanks' }) }),
}

svgs['snowmen.svg'] = snowmenOf()
for (const [name, text] of Object.entries(svgs)) {
  put(name, text)
}

// The moments, each at its frame: found in the reels themselves where a pose marks it.
const story = band.storyOf()
const reelFor = (mood, w, trek = 0) => band.reelOf(mood, story, w, trek)
const firstFrame = (frames, test) => frames.findIndex(test)
const thinkLoop = reelFor('working', work('think', 'stay')).loop
const onwardReel = reelFor('working', work('think', 'onward', { trek: 5 }))
const pushReel = reelFor('working', work('think', 'push'))
const moment = {
  pounce: at(story.spark.back + 5),
  urgent: at(16) / band.HURRY,
  bell: 1.2,
  plane: at(6),
  thanks: at(firstFrame(reelFor('working', work('think', 'start', { tone: 'thanks' })).intro, f => f.say === 'love') + 3),
  question: at(firstFrame(reelFor('working', work('think', 'start', { tone: 'question' })).intro, f => f.say === 'ask') + 1),
  think: at(firstFrame(thinkLoop, f => f.robin?.pose === 'peck')),
  edit: at(3),
  read: at(3),
  run: at(1),
  web: at(2),
  wait: at(1),
  helpers: at(8),
  commit: at(5),
  push: at(firstFrame(pushReel.intro, f => f.twinkle === 'big')),
  onward: at(firstFrame(onwardReel.intro, f => f.pal === 'wave') + 1),
  summit: 1.45,
  shovel: at(2 + 9),
  focus: 2,
  sleep: at(firstFrame([...band.sleepingOf().intro, ...band.sleepingOf().loop], f => f.say === 'z2') + 2),
  newyear: 1.2,
  ramadan: 1.2,
}

// The site, served so the page reaches into its frames.
const TYPES = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml' }
const server = createServer((request, response) => {
  try {
    const path = join(site, decodeURIComponent(new URL(request.url, 'http://x').pathname))
    const body = readFileSync(path)

    response.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' })
    response.end(body)
  } catch {
    response.writeHead(404)
    response.end()
  }
})

await new Promise(done => server.listen(0, '127.0.0.1', done))

const origin = `http://127.0.0.1:${server.address().port}`
const PORT = 9300 + Math.floor(Math.random() * 500)
const profile = mkdtempSync(join(tmpdir(), 'winter-chromium-'))
const chromium = spawn(
  'chromium',
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--hide-scrollbars',
    '--force-color-profile=srgb',
    '--font-render-hinting=none',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ],
  { stdio: 'ignore' },
)
const sleep = ms => new Promise(done => setTimeout(done, ms))

let target

for (let tries = 0; tries < 100 && target === undefined; tries++) {
  await sleep(100)
  try {
    target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(one => one.type === 'page')
  } catch {
    target = undefined
  }
}

const socket = new WebSocket(target.webSocketDebuggerUrl)

await new Promise(done => socket.addEventListener('open', done, { once: true }))

let calls = 0
const waiting = new Map()

socket.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  const call = waiting.get(message.id)

  if (call !== undefined) {
    waiting.delete(message.id)
    message.error ? call.reject(new Error(message.error.message)) : call.resolve(message.result)
  }
})

const send = (method, params = {}) =>
  new Promise((done, fail) => {
    const id = ++calls

    waiting.set(id, { resolve: done, reject: fail })
    socket.send(JSON.stringify({ id, method, params }))
  })
const evaluate = async expression => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value

// Opens a page at a size and in a color scheme, and waits for every frame in it.
async function open(page, { width, height, scheme = 'light', scale = 2 }) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'no-preference' }] })
  await send('Page.navigate', { url: `${origin}/${page}` })

  for (let tries = 0; tries < 200; tries++) {
    await sleep(50)
    if (
      await evaluate(
        "document.readyState==='complete'&&[...document.querySelectorAll('iframe')].every(f=>f.contentDocument&&f.contentDocument.readyState==='complete')",
      )
    ) {
      break
    }
  }
  await sleep(300)
}

// Holds every animation in each frame at its moment, in seconds: by the frame's id, or
// by the start of its id before a dash and a number.
async function freeze(times) {
  return evaluate(`(async () => {
    const times = ${JSON.stringify(times)}
    for (const frame of document.querySelectorAll('iframe')) {
      const t = times[frame.id] ?? times[frame.id.replace(/-\\d+$/, '')]
      if (t === undefined) continue
      for (const animation of frame.contentDocument.getAnimations()) {
        animation.pause()
        animation.currentTime = t * 1000
      }
    }
    await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))
    return true
  })()`)
}

async function shot(file, clip) {
  const { data } = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) })

  writeFileSync(file, Buffer.from(data, 'base64'))
}

await send('Page.enable')

// The two windows.
windowPage('day.html', 'light', 'scene-day.svg', 'idle.svg')
windowPage('night.html', 'dark', 'scene-night.svg', 'night.svg')
await open('day.html', { width: 640, height: 452 })
await freeze({ scene: 26, band: moment.pounce })
await shot(join(out, 'day.png'))
await open('night.html', { width: 640, height: 452, scheme: 'dark' })
await freeze({ scene: 176, band: at(3) })
await shot(join(out, 'night.png'))

// The two boards, each shot whole: the page made as tall as its rows first.
async function board(page, file, times) {
  await open(page, { width: 1016, height: 400 })

  const height = Math.ceil(await evaluate('document.documentElement.scrollHeight'))

  await open(page, { width: 1016, height })
  await freeze(times)
  await shot(join(out, file))
}

boardPage('prompt.html', 'Meeting your prompt', 'لقاء رسالتك', [
  { id: 'plane', file: 'plane.svg', en: 'Your prompt comes up as a paper plane', ar: 'تصعد رسالتك طائرةً ورقية' },
  { id: 'thanks', file: 'thanks.svg', en: 'Thanks or praise: a blush, a dance, a heart', ar: 'الشكر أو الثناء: خجلٌ ورقصة وقلب' },
  { id: 'urgent', file: 'urgent.svg', en: 'A hurry: a start, a bead of sweat', ar: 'الاستعجال: انتفاضة وقطرة عرق' },
  { id: 'question', file: 'question.svg', en: 'A question: it scratches its head', ar: 'السؤال: تحكّ رأسها' },
])
await board('prompt.html', 'prompt.png', moment)

boardPage('work.html', 'While Claude works', 'بينما يعمل Claude', [
  { id: 'think', file: 'think.svg', en: 'Thinking at the laptop, a robin on its hat', ar: 'تفكّر على حاسوبها وعصفور على قبعتها' },
  { id: 'edit', file: 'edit.svg', en: 'Editing files: code flies off to the spark', ar: 'تعديل الملفات: الشيفرة تطير إلى الشرارة' },
  { id: 'read', file: 'read.svg', en: 'Reading files', ar: 'قراءة الملفات' },
  { id: 'run', file: 'run.svg', en: 'Running a command', ar: 'تشغيل أمر' },
  { id: 'web', file: 'web.svg', en: 'Searching the web', ar: 'البحث في الويب' },
  { id: 'wait', file: 'wait.svg', en: 'Claude needs your answer', ar: 'ينتظر Claude جوابك' },
  { id: 'helpers', file: 'helpers.svg', en: 'A helper for each agent, the spark ablaze', ar: 'مساعدٌ لكل وكيل، والشرارة متأججة' },
])
await board('work.html', 'work.png', moment)

boardPage('way.html', 'Along the way', 'على طول الطريق', [
  { id: 'commit', file: 'commit.svg', en: 'A commit goes through: a flag waved', ar: 'عند كل commit: رايةٌ تلوّح' },
  { id: 'push', file: 'push.svg', en: 'A push goes through: a snowball thrown, a star', ar: 'عند كل push: كرة ثلج ونجمة' },
  { id: 'onward', file: 'onward.svg', en: 'A long turn: a flag a minute, a wave to the snowman', ar: 'مهمة طويلة: رايةٌ كل دقيقة وتلويحة لرجل الثلج' },
  { id: 'summit', file: 'summit.svg', en: 'A long, hard turn answered: the big flag, fireworks', ar: 'إجابة بعد مهمة طويلة شاقة: الراية الكبيرة وألعاب نارية' },
  { id: 'shovel', file: 'shovel.svg', en: 'The context fills, the snow drifts; compacted, it is shoveled away', ar: 'يمتلئ السياق فيتراكم الثلج، وعند الضغط يُجرف' },
])
await board('way.html', 'along-the-way.png', moment)

boardPage('quiet.html', 'Quiet times and occasions', 'أوقات هادئة ومناسبات', [
  { id: 'focus', file: 'focus.svg', en: '/winter focus: the spark\'s rays go out one by one', ar: 'جلسة التركيز: تنطفئ أشعة الشرارة واحداً تلو الآخر' },
  { id: 'bell', file: 'bell.svg', en: 'Time is up: a bell, and a stretch', ar: 'انتهى الوقت: جرس وتمطٍّ' },
  { id: 'sleep', file: 'sleep.svg', en: 'Late at night, asleep in the snow', ar: 'آخر الليل: تغفو في الثلج' },
  { id: 'newyear', file: 'newyear.svg', en: 'New Year: a party hat and confetti', ar: 'رأس السنة: قبعة احتفال وقصاصات ملونة' },
  { id: 'ramadan', file: 'ramadan.svg', en: 'Ramadan: a lantern over the band', ar: 'رمضان: فانوس فوق الشريط' },
  { id: 'men', file: 'snowmen.svg', en: 'A snowman built a part a day, its gifts earned by the answers', ar: 'رجل ثلج يُبنى جزءاً كل يوم، وهداياه من الإجابات' },
])
await board('quiet.html', 'quiet-times.png', moment)

// The animations: a prompt met with thanks, the work switched to editing, and the answer
// with fireworks; and the chase, from the spark rolling off to the walk home.
async function animate(name, parts) {
  let index = 0

  rmSync(frames, { recursive: true, force: true })
  mkdirSync(frames)

  for (const { file, from, to } of parts) {
    stripPage('strip.html', file)
    await open('strip.html', { width: 480, height: 36 })

    for (let frame = Math.round(from * FPS); frame < Math.round(to * FPS); frame++) {
      await freeze({ band: at(frame) })
      await shot(join(frames, `${String(index++).padStart(4, '0')}.png`), { x: 0, y: 0, width: 480, height: 36 })
    }
  }
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-framerate',
    String(FPS),
    '-i',
    join(frames, '%04d.png'),
    '-vf',
    'split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle',
    '-loop',
    '0',
    join(out, name),
  ])
  console.log(`${name}: ${index} frames`)
}

const thanks = reelFor('working', work('think', 'start', { tone: 'thanks' }))
const switched = reelFor('working', work('edit', 'switch', { tone: 'thanks' }))
const joy = band.endingOf('joy')

await animate('work.gif', [
  { file: 'thanks.svg', from: 0, to: thanks.intro.length / FPS + 1.5 },
  { file: 'switch-edit.svg', from: 0, to: switched.intro.length / FPS + 2.2 },
  { file: 'joy.svg', from: 0, to: joy.length / FPS + 0.6 },
])
await animate('chase.gif', [{ file: 'idle.svg', from: story.spark.out / FPS - 0.4, to: story.spark.back / FPS + 4.2 }])

socket.close()
chromium.kill()
await new Promise(done => chromium.once('exit', done))
server.close()
rmSync(site, { recursive: true, force: true })
rmSync(profile, { recursive: true, force: true })
console.log('done')
