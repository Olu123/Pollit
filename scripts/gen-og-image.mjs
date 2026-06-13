// Generates public/og-image.png (1200x630) for social sharing.
// Run with: node scripts/gen-og-image.mjs
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const out = join(__dirname, '..', 'public', 'og-image.png')

const RED = '#DC2626'
const GREEN = '#008751' // Nigerian flag green

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E33636"/>
      <stop offset="100%" stop-color="${RED}"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Subtle corner glow -->
  <circle cx="1080" cy="90" r="240" fill="#ffffff" opacity="0.06"/>
  <circle cx="120" cy="560" r="200" fill="#ffffff" opacity="0.05"/>

  <!-- Logo mark: white rounded square with a red bar chart -->
  <g transform="translate(540,108)">
    <rect width="120" height="120" rx="28" fill="#ffffff"/>
    <rect x="30" y="62" width="16" height="30" rx="4" fill="${RED}"/>
    <rect x="52" y="44" width="16" height="48" rx="4" fill="${RED}"/>
    <rect x="74" y="30" width="16" height="62" rx="4" fill="${RED}"/>
  </g>

  <!-- Wordmark: We + Poll + it -->
  <text x="600" y="370" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="112" fill="#ffffff" letter-spacing="-2">
    <tspan>We</tspan><tspan fill-opacity="0.5">+</tspan><tspan>Poll</tspan><tspan fill-opacity="0.5">+</tspan><tspan>it</tspan>
  </text>

  <!-- Tagline -->
  <text x="600" y="446" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="40" fill="#ffffff" fill-opacity="0.95">Have your say. Pave the way.</text>

  <!-- Sub-line -->
  <text x="600" y="500" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="500" font-size="26" fill="#ffffff" fill-opacity="0.8">Nigeria's people-powered opinion platform</text>

  <!-- Nigerian flag accent band along the bottom (green / white / green) -->
  <rect x="0"   y="614" width="400" height="16" fill="${GREEN}"/>
  <rect x="400" y="614" width="400" height="16" fill="#ffffff"/>
  <rect x="800" y="614" width="400" height="16" fill="${GREEN}"/>
</svg>`

await sharp(Buffer.from(svg)).png().toFile(out)
console.log('Wrote', out)
