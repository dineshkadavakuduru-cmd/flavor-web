"use client";

import { X, ArrowUpRight, Sparkles } from "lucide-react";
import type { RefObject } from "react";
import { CATEGORY_LABELS, STRENGTH_CONFIG } from "@/types";
import type { PositionedNode } from "@/lib/graph";
import type { Pairing } from "@/types";

interface Props {
  node: PositionedNode | null;
  pairings: Pairing[];
  nodeById: Map<string, PositionedNode>;
  onClose: () => void;
  onPick: (id: string) => void;
  headingRef: RefObject<HTMLHeadingElement>;
}

const strengthDot: Record<Pairing["strength"], string> = {
  classic: "#ffe9c4",
  strong: "#9db4d8",
  experimental: "#9ba2b4",
};

const STRENGTH_LABEL: Record<Pairing["strength"], string> = {
  classic: "Classic",
  strong: "Strong",
  experimental: "Lab",
};

export default function DetailPanel({ node, pairings, nodeById, onClose, onPick, headingRef }: Props) {
  if (!node) return null;
  const related = pairings
    .filter((p) => p.ingredientA === node.id || p.ingredientB === node.id)
    .map((p) => {
      const otherId = p.ingredientA === node.id ? p.ingredientB : p.ingredientA;
      return { pairing: p, other: nodeById.get(otherId) };
    })
    .filter((x): x is { pairing: Pairing; other: PositionedNode } => !!x.other)
    .sort((a, b) => {
      const order = { classic: 0, strong: 1, experimental: 2 };
      return order[a.pairing.strength] - order[b.pairing.strength];
    });

  // Longest curated name is 19 chars ("Portobello Mushroom"); anything past
  // that steps the display size down instead of overflowing the sheet.
  const longName = node.name.length > 14;

  return (
    <aside
      key={node.id}
      data-testid="detail-panel"
      className="glass pointer-events-auto relative flex min-h-0 w-full max-w-[380px] flex-col overflow-hidden rounded-2xl"
      style={{ borderTop: `3px solid ${node.color}` }}
      role="region"
      aria-labelledby="detail-heading"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        onClose();
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-25"
        style={{ background: `radial-gradient(60% 100% at 50% 0%, ${node.color}, transparent)` }}
        aria-hidden="true"
      />
      <div className="relative flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-6 md:pt-5">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ash">
            {CATEGORY_LABELS[node.category]} · {related.length} pairings
          </p>
          <h2
            id="detail-heading"
            tabIndex={-1}
            ref={headingRef}
            className={`font-display mt-1 rounded-sm font-semibold leading-[1.05] text-bone [overflow-wrap:anywhere] ${
              longName ? "text-2xl md:text-3xl" : "text-3xl md:text-4xl"
            }`}
          >
            {node.name}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="magnetic flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ash hover:bg-white/10 hover:text-bone"
          aria-label="Close panel"
        >
          <X size={16} />
        </button>
      </div>
      <div className="scroll-slim relative min-h-0 overflow-y-auto overscroll-contain px-4 pb-4 pt-3 md:px-6 md:pb-6">
        <p className="font-grotesk text-sm leading-relaxed text-bone/75">
          {node.description}
        </p>

        <div
          className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-white/[0.07] py-2"
          role="group"
          aria-label="Pairing strength legend"
        >
          {(["classic", "strong", "experimental"] as const).map((s) => (
            <span
              key={s}
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ash"
            >
              <span
                className="inline-block h-[3px] rounded-full"
                style={{
                  width: `${STRENGTH_CONFIG[s].width * 7}px`,
                  background: strengthDot[s],
                  opacity: STRENGTH_CONFIG[s].opacity,
                }}
                aria-hidden="true"
              />
              {s}
            </span>
          ))}
        </div>

        {related.length === 0 ? (
          <p className="mt-4 font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-ash">
            Nothing links to this orb yet — it is floating alone in the galaxy.
          </p>
        ) : (
          <div
            className="mt-2"
            role="list"
            aria-label={`${node.name} pairings`}
          >
            {related.map(({ pairing, other }) => (
              <div key={pairing.id} role="listitem" className="px-0.5">
                <button
                  onClick={() => onPick(other.id)}
                  className="detail-link group flex min-h-11 w-full items-center gap-2 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
                  aria-label={`${other.name}, ${STRENGTH_LABEL[pairing.strength]} pairing${pairing.note ? `, ${pairing.note}` : ""}`}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: other.color, boxShadow: `0 0 10px ${other.color}` }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 font-grotesk text-sm text-bone">
                      <span>
                        {other.name}
                      </span>
                      <ArrowUpRight
                        size={13}
                        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-70"
                        aria-hidden="true"
                      />
                    </span>
                    {pairing.note && (
                      <span className="block font-grotesk text-xs leading-relaxed text-ash">
                        {pairing.note}
                      </span>
                    )}
                  </span>
                  <span
                    className="shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]"
                    style={{
                      borderColor: `${strengthDot[pairing.strength]}44`,
                      color: strengthDot[pairing.strength],
                    }}
                  >
                    {STRENGTH_LABEL[pairing.strength]}
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2.5">
          <Sparkles size={14} style={{ color: node.color }} aria-hidden="true" />
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ash">
            Color is the language — {CATEGORY_LABELS[node.category]} glow
          </p>
        </div>
      </div>
    </aside>
  );
}
