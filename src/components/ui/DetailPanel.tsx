"use client";

import { X, ArrowUpRight, Sparkles } from "lucide-react";
import { CATEGORY_LABELS, STRENGTH_CONFIG } from "@/types";
import type { PositionedNode } from "@/lib/graph";
import type { Pairing } from "@/types";

interface Props {
  node: PositionedNode | null;
  pairings: Pairing[];
  nodeById: Map<string, PositionedNode>;
  onClose: () => void;
  onPick: (id: string) => void;
}

const strengthDot: Record<Pairing["strength"], string> = {
  classic: "#ffe9c4",
  strong: "#9db4d8",
  experimental: "#8b93a7",
};

export default function DetailPanel({ node, pairings, nodeById, onClose, onPick }: Props) {
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

  return (
    <aside
      key={node.id}
      className="glass cinematic-reveal pointer-events-auto relative w-full max-w-[380px] overflow-hidden rounded-2xl"
      style={{ borderTop: `3px solid ${node.color}` }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-25"
        style={{ background: `radial-gradient(60% 100% at 50% 0%, ${node.color}, transparent)` }}
      />
      <div className="relative p-6">
        <div className="flex items-start justify-between gap-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ash">
            {CATEGORY_LABELS[node.category]} · {node.pairingCount ?? 0} pairings
          </p>
          <button
            onClick={onClose}
            className="magnetic rounded-full p-1.5 text-ash hover:bg-white/10 hover:text-bone"
            aria-label="Close panel"
          >
            <X size={16} />
          </button>
        </div>

        <h2 className="font-display mt-2 text-4xl font-semibold leading-[1.02] text-bone">
          {node.name}
        </h2>
        <p className="mt-3 font-grotesk text-[14px] leading-relaxed text-bone/75">
          {node.description}
        </p>

        <div className="mt-5 flex items-center gap-4 border-y border-white/[0.07] py-3">
          {(["classic", "strong", "experimental"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ash">
              <span
                className="inline-block h-[3px] rounded-full"
                style={{
                  width: `${STRENGTH_CONFIG[s].width * 7}px`,
                  background: strengthDot[s],
                  opacity: STRENGTH_CONFIG[s].opacity,
                }}
              />
              {s}
            </span>
          ))}
        </div>

        <div className="scroll-slim mt-2 max-h-[38vh] overflow-y-auto pr-1">
          {related.map(({ pairing, other }) => (
            <button
              key={pairing.id}
              onClick={() => onPick(other.id)}
              className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: other.color, boxShadow: `0 0 10px ${other.color}` }}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 font-grotesk text-sm text-bone">
                  {other.name}
                  <ArrowUpRight size={13} className="opacity-0 transition-opacity group-hover:opacity-70" />
                </span>
                {pairing.note && (
                  <span className="block truncate font-grotesk text-xs text-ash">{pairing.note}</span>
                )}
              </span>
              <span
                className="shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]"
                style={{ borderColor: `${strengthDot[pairing.strength]}44`, color: strengthDot[pairing.strength] }}
              >
                {pairing.strength === "classic" ? "Classic" : pairing.strength === "strong" ? "Strong" : "Lab"}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2.5">
          <Sparkles size={14} style={{ color: node.color }} />
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ash">
            Color is the language — {CATEGORY_LABELS[node.category]} glow
          </p>
        </div>
      </div>
    </aside>
  );
}
