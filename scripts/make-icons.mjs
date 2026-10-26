// Draws the app icon (same design as public/logo.svg) into the PNG/ICO files the PWA needs.
// Uses only Node built-ins, so it works without native image libraries. Run: npm run icons
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BRAND = [0x1f, 0x6f, 0x5c]
const WHITE = [0xff, 0xff, 0xff]
const ACCENT = [0xf2, 0xb8, 0x4b]
const HOUSE = [
  [256, 104], [96, 232], [136, 232], [136, 408], [232, 408], [232, 304],
  [280, 304], [280, 408], [376, 408], [376, 232], [416, 232],
]

function insidePolygon(x, y, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function insideRoundedSquare(x, y, r) {
  if (x < 0 || y < 0 || x > 512 || y > 512) return false
  const cx = Math.min(Math.max(x, r), 512 - r)
  const cy = Math.min(Math.max(y, r), 512 - r)
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

// Colour at a point in the 512×512 logo space, or null for transparent.
function sample(x, y, { rounded, scale }) {
  if (!insideRoundedSquare(x, y, rounded ? 96 : 0)) return null
  const lx = (x - 256) / scale + 256
  const ly = (y - 256) / scale + 256
  if ((lx - 256) ** 2 + (ly - 214) ** 2 <= 26 * 26) return ACCENT
  if (insidePolygon(lx, ly, HOUSE)) return WHITE
  return BRAND
}

function render(size, opts) {
  const ss = 4 // 4×4 supersampling for smooth edges
  const pixels = Buffer.alloc(size * size * 4)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = sample(((px + (sx + 0.5) / ss) / size) * 512, ((py + (sy + 0.5) / ss) / size) * 512, opts)
          if (c) {
            r += c[0]; g += c[1]; b += c[2]; a++
          }
        }
      }
      const i = (py * size + px) * 4
      if (a) {
        pixels[i] = Math.round(r / a)
        pixels[i + 1] = Math.round(g / a)
        pixels[i + 2] = Math.round(b / a)
      }
      pixels[i + 3] = Math.round((a / (ss * ss)) * 255)
    }
  }
  return encodePng(size, pixels)
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(size, pixels) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // RGBA
  const rows = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) pixels.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// An .ico file can hold a PNG directly.
function encodeIco(size, png) {
  const head = Buffer.alloc(22)
  head.writeUInt16LE(1, 2) // type: icon
  head.writeUInt16LE(1, 4) // one image
  head[6] = size
  head[7] = size
  head.writeUInt16LE(1, 10) // colour planes
  head.writeUInt16LE(32, 12) // bits per pixel
  head.writeUInt32LE(png.length, 14)
  head.writeUInt32LE(22, 18) // image data offset
  return Buffer.concat([head, png])
}

const out = (name, data) => {
  writeFileSync(new URL(`../public/${name}`, import.meta.url), data)
  console.log('wrote public/' + name)
}

const icon = { rounded: true, scale: 1 }
out('pwa-64x64.png', render(64, icon))
out('pwa-192x192.png', render(192, icon))
out('pwa-512x512.png', render(512, icon))
// Maskable: full-bleed background, artwork inside the central safe zone.
out('maskable-icon-512x512.png', render(512, { rounded: false, scale: 0.8 }))
// iOS rounds the corners itself and shows transparency as black, so use a full square.
out('apple-touch-icon-180x180.png', render(180, { rounded: false, scale: 0.9 }))
out('favicon.ico', encodeIco(48, render(48, icon)))
