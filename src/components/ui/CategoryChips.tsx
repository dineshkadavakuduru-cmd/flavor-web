"use client";

import { CATEGORY_COLORS, CATEGORY_LABELS, type IngredientCategory } from "@/types";
import { cn } from "@/lib/utils";

const ORDER: IngredientCategory[] = [
  "protein",
  "herb",
  "spice",
  "vegetable",
  "fruit",
  "dairy",
  "grain",
  "other",
];

export default function CategoryChips({
  active,
  onToggle,
  onReset,
}: {
  active: Set<string>;
  onToggle: (c: string) => void;
  onReset: () => void;
}) {
  const allOn = active.size === ORDER.length;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {ORDER.map((c) => {
        const on = active.has(c);
        const color = CATEGORY_COLORS[c];
        return (
          <button
            key={c}
            onClick={() => onToggle(c)}
            className={cn(
              "tilt-pill rounded-full border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] backdrop-blur-md",
              on ? "text-bone" : "border-white/10 bg-white/[0.03] text-ash hover:text-bone"
            )}
            style={
              on
                ? {
                    borderColor: `${color}88`,
                    background: `${color}14`,
                    boxShadow: `0 0 18px ${color}33, inset 0 0 12px ${color}11`,
                  }
                : undefined
            }
          >
            <span
              className="mr-2 inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: color, boxShadow: `0 0 8px ${color}`, opacity: on ? 1 : 0.35 }}
            />
            {CATEGORY_LABELS[c]}
          </button>
        );
      })}
      {!allOn && (
        <button
          onClick={onReset}
          className="rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ash underline-offset-4 hover:text-bone hover:underline"
        >
          Reset
        </button>
      )}
    </div>
  );
}
