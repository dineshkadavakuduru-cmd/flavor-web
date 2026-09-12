# Flavor Web — 3D Ingredient Pairing Explorer

> A living constellation of flavor. Search an ingredient, fly to it, and see what it loves.

**Live demo:** https://food-jet-delta.vercel.app

Instead of a recipe list or a data dashboard, Flavor Web renders ingredients as glowing orbs in a slowly rotating 3D "flavor galaxy." Click an orb (or search for it) and the camera flies to it while its pairings light up around it — classic combos burn as thick gold threads, wild experiments flicker as faint dashed ones.

## What you can do

- **Explore the idle galaxy** — ~100 ingredients positioned by a 3D force-directed layout, auto-rotating, nodes bobbing, edges pulsing. It looks alive with zero input.
- **Search** — floating typeahead that highlights matches and dims the rest.
- **Select an ingredient** — eased camera flight centers it; direct pairings pull closer and brighten while everything else fades. A glass detail panel slides in with its flavor profile and clickable pairing list.
- **Read pairing strength at a glance** — `classic` = thick bright thread, `strong` = medium thread, `experimental` = thin dashed faint thread.
- **Filter by category** — Protein / Herbs / Spices / Vegetables / Fruits / Dairy / Grains / Other chips dim non-matches without destroying the layout. Color is the primary language: amber proteins, green herbs, ember spices, orchid fruits, glacial dairy.
- **Surprise me** — jumps to a random well-connected ingredient for idle exploration.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript, React 18 |
| 3D | react-three-fiber 8, drei (`Stars`, `OrbitControls`), three.js instanced meshes |
| Layout | Hand-rolled deterministic 3D force simulation (link attraction + repulsion + gravity) |
| Post | `@react-three/postprocessing` bloom + vignette (auto-disabled on mobile) |
| UI | Tailwind chrome only — Space Grotesk + JetBrains Mono, glass panels, film grain |
| Data | Firebase Firestore when configured, bundled JSON fallback (fully in-memory graph) |
| Deploy | Vercel |

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production check
```

Optional — live Firestore instead of bundled JSON:

```bash
cp .env.example .env.local   # fill in Firebase keys
npm run seed                 # pushes src/data/*.json to Firestore
```

## Data model

`ingredients/{id}` → `{ name, category, description, color }`
`pairings/{id}` → `{ ingredientA, ingredientB, strength: classic | strong | experimental, note? }`

The dataset (`src/data/ingredients.json`, `src/data/pairings.json` — 102 ingredients, 158 pairings) is hand-curated and checked into the repo: tomato×basil, chocolate×chili, pork×apple, salmon×dill, strawberry×balsamic… Edit the JSON, not the database.

## Project structure

```
src/
  app/            # layout, globals.css, page (all UI state lives here)
  components/3d/  # FlavorGalaxy (nodes, edges, camera rig, bloom), GalaxyCanvas
  components/ui/  # SearchBar, CategoryChips, DetailPanel, Overlays
  lib/            # graph layout, firebase, utils
  hooks/          # useGraphData (Firestore → fallback → layout), useIsMobile
  data/           # ingredients.json, pairings.json
scripts/seed.ts   # one-time Firestore seeder
DESIGN.md         # visual source of truth — read before restyling
```

## Design rules (from DESIGN.md)

Game menu, not dashboard: near-black void, emissive orbs, hairline glass chrome. Nothing snaps — cameras ease, nodes drift, edges breathe. No purple-blue gradients, no default shadcn look, no photorealistic food.

## Performance

- Instanced meshes for all nodes + halo shells (~100 draw calls total, not per node)
- `dpr` capped, bloom off on mobile, `Stars` count reduced, touch-orbit simplified
- 3D canvas lazy-loaded (`ssr: false`) — never server-rendered
