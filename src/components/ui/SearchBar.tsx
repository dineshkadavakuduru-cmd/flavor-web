"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { PositionedNode } from "@/lib/graph";

interface Props {
  nodes: PositionedNode[];
  query: string;
  onQuery: (q: string) => void;
  onPick: (id: string) => void;
}

export default function SearchBar({ nodes, query, onQuery, onPick }: Props) {
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return nodes
      .filter((n) => n.name.toLowerCase().includes(q))
      .sort((a, b) => (b.pairingCount ?? 0) - (a.pairingCount ?? 0))
      .slice(0, 8);
  }, [nodes, query]);

  return (
    <div className="relative w-full max-w-md">
      <div className="glass ripple-btn flex items-center gap-3 rounded-full py-3 pl-5 pr-3 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
        <Search size={16} className="shrink-0 text-ash" />
        <input
          value={query}
          onChange={(e) => {
            onQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 140)}
          placeholder="Search the galaxy…"
          className="w-full bg-transparent font-mono text-[13px] tracking-wide text-bone placeholder:text-ash/70 focus:outline-none"
        />
        {query && (
          <button
            onMouseDown={() => onQuery("")}
            className="magnetic rounded-full p-1.5 text-ash hover:bg-white/10 hover:text-bone"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="glass cinematic-reveal absolute top-full z-50 mt-2 w-full overflow-hidden rounded-2xl p-1.5">
          {results.map((r) => (
            <button
              key={r.id}
              onMouseDown={() => {
                onPick(r.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.07]"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_12px_currentColor]"
                style={{ background: r.color, color: r.color }}
              />
              <span className="flex-1">
                <span className="block font-grotesk text-sm text-bone">{r.name}</span>
                <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ash">
                  {r.category} · {r.pairingCount ?? 0} links
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
