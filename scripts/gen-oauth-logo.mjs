// Generates public/wepollit-oauth-logo.png (120x120) for the Google OAuth
// consent screen. Google requires a square logo (no rounded corners).
// Run with: node scripts/gen-oauth-logo.mjs
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const out = join(__dirname, '..', 'public', 'wepollit-oauth-logo.png')

const RED = '#DC2626'

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <!-- Square background, no rounding — Google OAuth requires a square logo -->
  <rect width="120" height="120" fill="${RED}"/>

  <!-- Ascending bar chart mark, centered — same geometry as the mark in
       scripts/gen-og-image.mjs, colors inverted (white on red instead of
       red on white) -->
  <rect x="30" y="62" width="16" height="30" rx="4" fill="#ffffff"/>
  <rect x="52" y="44" width="16" height="48" rx="4" fill="#ffffff"/>
  <rect x="74" y="30" width="16" height="62" rx="4" fill="#ffffff"/>
</svg>`

await sharp(Buffer.from(svg)).resize(120, 120).png().toFile(out)
console.log('Wrote', out)
