import { useEffect, useState } from "react";
import type { Ingredient, Pairing } from "@/types";
import { layoutGraph, pairingCounts, type PositionedNode } from "@/lib/graph";
import { getDb } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import ingredientsJson from "@/data/ingredients.json";
import pairingsJson from "@/data/pairings.json";

export interface GalaxyData {
  nodes: PositionedNode[];
  pairings: Pairing[];
  loading: boolean;
}

export function useGraphData(refreshKey = 0): GalaxyData {
  const [nodes, setNodes] = useState<PositionedNode[]>([]);
  const [pairings, setPairings] = useState<Pairing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let ingredients: Ingredient[] = (
        ingredientsJson as { ingredients: Ingredient[] }
      ).ingredients;
      let pairs: Pairing[] = (pairingsJson as { pairings: Pairing[] }).pairings;
      try {
        const db = getDb();
        if (db) {
          const [ingSnap, pairSnap] = await Promise.all([
            getDocs(collection(db, "ingredients")),
            getDocs(collection(db, "pairings")),
          ]);
          if (!ingSnap.empty && !pairSnap.empty && !cancelled) {
            ingredients = ingSnap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<Ingredient, "id">),
            }));
            pairs = pairSnap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<Pairing, "id">),
            }));
          }
        }
      } catch {
        // fall back to bundled JSON
      }
      if (cancelled) return;
      const validIds = new Set(ingredients.map((i) => i.id));
      const cleanPairs = pairs.filter(
        (p) => validIds.has(p.ingredientA) && validIds.has(p.ingredientB)
      );
      const counts = pairingCounts(cleanPairs);
      const positioned = layoutGraph(
        ingredients.map((i) => ({ ...i, pairingCount: counts.get(i.id) ?? 0 })),
        cleanPairs
      );
      setNodes(positioned);
      setPairings(cleanPairs);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { nodes, pairings, loading };
}
