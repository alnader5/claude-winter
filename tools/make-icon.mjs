// Writes the mod's icon, .claude-plugin/icon.png: Claude's pixel character in its
// knitted hat and striped scarf, standing in the snow beside the orange spark under a
// winter night's falling snow. The character is the band's own sprite, read from
// hooks/sprite.ts pixel for pixel, each of its pixels a square of the icon's grid; the
// PNG is written here with no library. Run with: node tools/make-icon.mjs

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

import {
  ARMS,
  BODY,
  EYE,
  EYES,
  HAT,
  KNIT_PINK,
  KNIT_RED,
  LEGS,
  ORANGE,
  SCARF_STRIPES,
  SCARF_TAIL,
  SCARF_TAIL_STRIPE,
  SCARF_WRAP,
  STRIPE,
} from '../hooks/sprite.ts'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.claude-plugin', 'icon.png')

// The icon: 1040 pixels square, a grid of 26 by 26 squares of 40 pixels.
const CELL = 40
const GRID = 26
const SIZE = CELL * GRID
const CORNER = 208

// The night sky, top to bottom; the snow on the ground and its gray-blue edge; the
// falling snow; and the spark's light middle.
const SKY_TOP = [0x1b, 0x2a, 0x3f]
const SKY_LOW = [0x35, 0x50, 0x70]
const SNOW = '#eef4fb'
const SNOW_EDGE = '#a9bccf'
const FLAKE = '#e6eef7'
const SPARK_LIGHT = '#f2a27f'

// Where the character stands on the grid, by its sprite's top left corner, and the row
// the snow starts on.
const AT = { column: 1, row: 11 }
const GROUND = 21

const rgba = new Uint8ClampedArray(SIZE * SIZE * 4)

const hex = color => [1, 3, 5].map(at => parseInt(color.slice(at, at + 2), 16))

// Lays `color` over the pixel at x, y, `alpha` of it.
function blend(x, y, [r, g, b], alpha = 1) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || alpha <= 0) {
    return
  }
  const at = (y * SIZE + x) * 4
  const under = rgba[at + 3] / 255
  const out = alpha + under * (1 - alpha)

  rgba[at] = (r * alpha + rgba[at] * under * (1 - alpha)) / out
  rgba[at + 1] = (g * alpha + rgba[at + 1] * under * (1 - alpha)) / out
  rgba[at + 2] = (b * alpha + rgba[at + 2] * under * (1 - alpha)) / out
  rgba[at + 3] = out * 255
}

// Fills squares of the grid: [column, row, width, height], from a grid corner. A row
// may be a half: the ground's edge is half a square, as the band's is half its ground.
function cells(rects, color, from = { column: 0, row: 0 }, alpha = 1) {
  const rgb = typeof color === 'string' ? hex(color) : color

  for (const [column, row, width, height] of rects) {
    const top = Math.round((from.row + row) * CELL)
    const bottom = Math.round((from.row + row + height) * CELL)

    for (let y = top; y < bottom; y++) {
      for (let x = (from.column + column) * CELL; x < (from.column + column + width) * CELL; x++) {
        blend(x, y, rgb, alpha)
      }
    }
  }
}

// The sky, falling to the snow.
for (let y = 0; y < SIZE; y++) {
  const t = Math.min(1, y / (GROUND * CELL))
  const color = SKY_TOP.map((top, index) => top + (SKY_LOW[index] - top) * t)

  for (let x = 0; x < SIZE; x++) {
    blend(x, y, color)
  }
}

// Snow falling: flakes of one square and of a small cross, scattered by hand.
cells(
  [
    [3, 2, 1, 1], [9, 1, 1, 1], [15, 3, 1, 1], [21, 2, 1, 1], [7, 6, 1, 1], [20, 7, 1, 1],
    [24, 5, 1, 1], [1, 8, 1, 1], [13, 5, 1, 1], [23, 11, 1, 1], [1, 13, 1, 1],
  ],
  FLAKE,
  undefined,
  0.85,
)
for (const [column, row] of [
  [5, 3],
  [18, 4],
  [10, 6],
]) {
  cells(
    [
      [column, row - 1, 1, 1],
      [column - 1, row, 3, 1],
      [column, row + 1, 1, 1],
    ],
    FLAKE,
    undefined,
    0.7,
  )
}

// The snow on the ground, edged on top by half a square.
cells([[0, GROUND, GRID, GRID - GROUND]], SNOW)
cells([[0, GROUND, GRID, 0.5]], SNOW_EDGE)

// The spark beside the character, resting on the snow: its glow, then its rays and its
// light middle, a pixel star of the band's orange.
const star = { column: 19, row: 16 }
const middle = { x: (star.column + 2.5) * CELL, y: (star.row + 2.5) * CELL }

for (let y = middle.y - 5 * CELL; y < middle.y + 5 * CELL; y++) {
  for (let x = middle.x - 5 * CELL; x < middle.x + 5 * CELL; x++) {
    const reach = Math.hypot(x + 0.5 - middle.x, y + 0.5 - middle.y) / (4 * CELL)

    blend(x, y, hex(ORANGE), 0.5 * Math.max(0, 1 - reach) ** 2)
  }
}
cells(
  [
    [0, 0, 1, 1],
    [2, 0, 1, 1],
    [4, 0, 1, 1],
    [1, 1, 3, 1],
    [0, 2, 5, 1],
    [1, 3, 3, 1],
    [0, 4, 1, 1],
    [2, 4, 1, 1],
    [4, 4, 1, 1],
  ],
  ORANGE,
  star,
)
cells([[2, 2, 1, 1]], SPARK_LIGHT, star)

// The character as the band draws it at home: its shadow on the snow's edge, legs,
// body, knitted hat with its pom-pom, scarf with its end hanging in front, arms, eyes.
cells([[2, 10, 14, 0.5]], [0x0b, 0x12, 0x20], AT, 0.22)
cells(LEGS.stand, ORANGE, AT)
cells(BODY, ORANGE, AT)
cells(HAT.crown, KNIT_RED, AT)
cells(HAT.cuff, KNIT_PINK, AT)
cells(HAT.pom, KNIT_PINK, AT)
cells(SCARF_WRAP, KNIT_RED, AT)
cells(SCARF_STRIPES, STRIPE, AT)
cells(SCARF_TAIL.still, KNIT_RED, AT)
cells(SCARF_TAIL_STRIPE.still, STRIPE, AT)
cells(ARMS.rest, ORANGE, AT)
cells(EYES.ahead, EYE, AT)

// The rounded corners: clear outside them, smooth along them.
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dx = Math.max(CORNER - x - 0.5, x + 0.5 - (SIZE - CORNER), 0)
    const dy = Math.max(CORNER - y - 0.5, y + 0.5 - (SIZE - CORNER), 0)

    if (dx > 0 && dy > 0) {
      const cover = Math.max(0, Math.min(1, CORNER - Math.hypot(dx, dy) + 0.5))

      rgba[(y * SIZE + x) * 4 + 3] *= cover
    }
  }
}

// The PNG: its signature, then a header, the rows deflated, and the end, each chunk
// with its CRC.
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n

  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }

  return c >>> 0
})

function crcOf(bytes) {
  let c = 0xffffffff

  for (const byte of bytes) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  }

  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)

  length.writeUInt32BE(data.length)
  crc.writeUInt32BE(crcOf(body))

  return Buffer.concat([length, body, crc])
}

const header = Buffer.alloc(13)

header.writeUInt32BE(SIZE, 0)
header.writeUInt32BE(SIZE, 4)
header[8] = 8
header[9] = 6

const rows = Buffer.alloc((SIZE * 4 + 1) * SIZE)

for (let y = 0; y < SIZE; y++) {
  rows[y * (SIZE * 4 + 1)] = 0
  Buffer.from(rgba.buffer, y * SIZE * 4, SIZE * 4).copy(rows, y * (SIZE * 4 + 1) + 1)
}

writeFileSync(
  OUT,
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]),
)
console.log(`wrote ${OUT}: ${SIZE} by ${SIZE}`)
