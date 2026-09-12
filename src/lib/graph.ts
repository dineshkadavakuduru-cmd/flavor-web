import type { Ingredient, Pairing } from "@/types";

export interface PositionedNode extends Ingredient {
  x: number;
  y: number;
  z: number;
  vx?: number;
  vy?: number;
  vz?: number;
}

/** Deterministic 3D force layout: link attraction + sampled repulsion + gravity. */
export function layoutGraph(
  ingredients: Ingredient[],
  pairings: Pairing[],
  seed = 7
): PositionedNode[] {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const R = 26;
  const nodes: PositionedNode[] = ingredients.map((ing) => ({
    ...ing,
    x: (rand() - 0.5) * R * 2,
    y: (rand() - 0.5) * R * 1.4,
    z: (rand() - 0.5) * R * 2,
    vx: 0,
    vy: 0,
    vz: 0,
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const strengthLen = { classic: 7, strong: 9.5, experimental: 12 } as const;

  for (let iter = 0; iter < 140; iter++) {
    const cooling = 1 - iter / 150;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j += 2) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const d2 = Math.max(dx * dx + dy * dy + dz * dz, 1);
        const d = Math.sqrt(d2);
        const f = ((26 * cooling) / d2) * Math.min(d, 14);
        const ux = dx / d;
        const uy = dy / d;
        const uz = dz / d;
        a.vx! += ux * f;
        a.vy! += uy * f;
        a.vz! += uz * f;
        b.vx! -= ux * f;
        b.vy! -= uy * f;
        b.vz! -= uz * f;
      }
    }
    for (const p of pairings) {
      const a = byId.get(p.ingredientA);
      const b = byId.get(p.ingredientB);
      if (!a || !b) continue;
      const want = strengthLen[p.strength] ?? 9;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const d = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), 0.01);
      const f = ((d - want) / want) * 0.16 * cooling;
      const k = f * d * 0.12;
      a.vx! += (dx / d) * k;
      a.vy! += (dy / d) * k;
      a.vz! += (dz / d) * k;
      b.vx! -= (dx / d) * k;
      b.vy! -= (dy / d) * k;
      b.vz! -= (dz / d) * k;
    }
    for (const n of nodes) {
      n.vx! += -n.x * 0.006 * cooling;
      n.vy! += -n.y * 0.006 * cooling;
      n.vz! += -n.z * 0.006 * cooling;
      n.vx! *= 0.82;
      n.vy! *= 0.82;
      n.vz! *= 0.82;
      n.x += Math.max(-3, Math.min(3, n.vx!));
      n.y += Math.max(-3, Math.min(3, n.vy!));
      n.z += Math.max(-3, Math.min(3, n.vz!));
    }
  }
  return nodes;
}

export function neighborMap(pairings: Pairing[]) {
  const map = new Map<string, Map<string, Pairing>>();
  const add = (a: string, b: string, p: Pairing) => {
    if (!map.has(a)) map.set(a, new Map());
    map.get(a)!.set(b, p);
  };
  for (const p of pairings) {
    add(p.ingredientA, p.ingredientB, p);
    add(p.ingredientB, p.ingredientA, p);
  }
  return map;
}

export function pairingCounts(pairings: Pairing[]) {
  const counts = new Map<string, number>();
  for (const p of pairings) {
    counts.set(p.ingredientA, (counts.get(p.ingredientA) ?? 0) + 1);
    counts.set(p.ingredientB, (counts.get(p.ingredientB) ?? 0) + 1);
  }
  return counts;
}
