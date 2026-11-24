"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  testId,
}: {
  active: Set<string>;
  onToggle: (c: string) => void;
  onReset: () => void;
  testId?: string;
}) {
  const allOn = active.size === ORDER.length;
  const strip = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const scroller = strip.current;
    const content = chips.current;
    if (!scroller || !content) return;
    const updateEdges = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scroller;
      const left = scrollLeft > 1;
      const right = scrollWidth - clientWidth - scrollLeft > 1;
      setEdges((previous) => previous.left === left && previous.right === right ? previous : { left, right });
    };
    const observer = new ResizeObserver(updateEdges);
    observer.observe(scroller);
    observer.observe(content);
    scroller.addEventListener("scroll", updateEdges, { passive: true });
    updateEdges();
    return () => {
      observer.disconnect();
      scroller.removeEventListener("scroll", updateEdges);
    };
  }, []);

  return (
    <div className="category-strip pointer-events-auto w-full max-w-4xl">
      {(["left", "right"] as const).map((edge) => {
        const Icon = edge === "left" ? ChevronLeft : ChevronRight;
        return (
          <button
            key={edge}
            type="button"
            aria-label={edge === "left" ? "Scroll to earlier categories" : "Scroll to more categories"}
            aria-controls="category-scroller"
            aria-disabled={!edges[edge]}
            tabIndex={edges[edge] ? 0 : -1}
            className="category-scroll-button"
            onClick={() => {
              if (!edges[edge] || !strip.current) return;
              strip.current.scrollBy({ left: strip.current.clientWidth * (edge === "left" ? -0.8 : 0.8) });
            }}
          >
            <Icon size={18} aria-hidden="true" />
          </button>
        );
      })}
      <div ref={strip} id="category-scroller" className="category-scroller">
        <div ref={chips} className="mx-auto flex w-max items-center gap-2 px-1 py-1.5" data-testid={testId} role="group" aria-label="Ingredient category filters">
          {ORDER.map((c) => {
            const on = active.has(c);
            const color = CATEGORY_COLORS[c];
            return (
              <button
                key={c}
                onClick={() => onToggle(c)}
                className={cn(
                  "category-chip tilt-pill min-h-11 rounded-full border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] backdrop-blur-md md:min-h-0",
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
                aria-pressed={on}
                aria-label={`${CATEGORY_LABELS[c]} category filter`}
              >
                <span
                  className="mr-2 inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: color, boxShadow: `0 0 8px ${color}`, opacity: on ? 1 : 0.35 }}
                  aria-hidden="true"
                />
                {CATEGORY_LABELS[c]}
              </button>
            );
          })}
          {!allOn && (
            <button
              onClick={onReset}
              className="min-h-11 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ash underline-offset-4 hover:text-bone hover:underline md:min-h-0"
              aria-label="Reset all category filters"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
