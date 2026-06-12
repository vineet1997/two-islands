# TWO ISLANDS

A travelogue of salt, spice and monsoon light — Maldives × Sri Lanka, June 2026.

A phantom.land-inspired WebGL gallery: 22 photo cards mounted on the inside of a
sphere, camera at the center. Drag to look around; click a card and it flies into
the camera and becomes the story page.

## Stack
- Vite + TypeScript (no framework)
- three.js — sphere scene, raycasting, video texture
- GSAP — all motion (drag easing, fly-to-camera transition, reveals)
- Lenis — smooth scroll on story pages

## Develop
```bash
npm install
npm run dev
```

## Assets
Original photos live one folder up (not committed). Derivatives are generated with:
```bash
npm run assets        # tile/page/hero WebP + LQIP + video loops (EXIF stripped)
node scripts/blur-plate.mjs   # one-off licence-plate blur for IMG-006
```

## Deploy
`npm run build` → static `dist/`. Deployed on Vercel; hash-based routing, no
server config needed.

## Content
The full curation (which photos form which "moment", covers, captions, sphere
slots) is encoded in `src/data/moments.ts` and `src/data/photos.ts`. The plan
that produced it is in `../PLAN.md`.
