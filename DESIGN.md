# Flavor Web — DESIGN.md
Source of truth for taste. Informed by refero.design systems (Linear midnight precision, Mercury alpine banking, Modal phosphor terminal) + motionsites.ai cinematic 3D prompts + Magic UI / Smooth UI / unlumen motion language.

## 1. Vibe — game menu, not dashboard
Deep-space void `#05060a → #0e1220` radial vignette, never linear purple-blue gradient. Emissive orbs float in fog. UI chrome is glass, hairline borders `white/8`, 16px radius, backdrop-blur 20px. Feels like a space-exploration codex meets a chef's notebook.

## 2. Color language (primary way to read the graph)
- protein `#FFB347` warm amber
- herb `#7DD87D` chlorophyll green
- spice `#FF6B47` ember red-orange
- vegetable `#8FBC8F` deep sage
- fruit `#E879C8` orchid pink-violet
- dairy `#A8D0E6` glacial pale blue
- grain `#F4D59E` toasted sand
- other `#C0C0C0` moon silver
Background stays near-black so glow carries. Text bone `#EDE8DC`, muted ash `#8B93A7`.

## 3. Typography
- Display: Space Grotesk 600, tight -0.04em, huge cinematic reveal (blur 8px → 0, y 24 → 0, 0.7s expo). Used ONLY for the focused ingredient name.
- Chrome: Space Grotesk 400/500 for labels and buttons.
- Data: JetBrains Mono 12px, uppercase, tracking 0.18em for categories, strengths, counts.

## 4. 3D material rules
- Nodes: icosahedron detail 1, unlit (`meshBasicMaterial`, self-lit look), per-instance category color, scale = 0.55 + pairingCount × 0.055, plus an additive halo shell.
- Edges: additive blending glow threads. classic = warm bright `#ffe9c4`, strong = cool mid blend, experimental = dim dashed (`dashSize 0.6, gap 0.45`).
- Bloom: luminanceThreshold 0.12, intensity 1.15, mipmapBlur. Disabled on mobile / prefers-reduced-motion.
- Stars: 2600 pts (900 mobile), radius 120, depth 60, factor 3.2, fade, speed 0.4.
- Fog: exp2 `#05060a` 0.02. Ambient 0.35 + ember/blue rim point lights.

## 5. Motion
- Nothing snaps. Camera flights: cubic easeInOut over 1.6s, damped OrbitControls (dampingFactor 0.06).
- Idle: graph group rotates slowly, nodes bob on sine, edges pulse opacity.
- Focus: non-neighbors dim to 0.1, neighbors pull 12% toward focus and brighten.
- UI panels: cinematic reveal (rise + deblur); buttons magnetic lift + ripple press; chips tilt on hover.

## 6. UI chrome patterns
- Search: floating top-center glass pill, mono typeahead with category dot + link count.
- Chips: glow-border pills when active, ghost when inactive.
- Detail panel: right-side 380px glass sheet with 3px category-color top rule.
- Surprise: ember-glow dice button with 180° icon spin on hover.

## 7. Do / Don't
Do: fog, vignette, film grain 5%, hairlines, mono microcopy, generous void.
Don't: gradients (esp. purple-blue), flat card grids, default shadcn radius/shadow, photorealistic food, emoji icons, light mode.
