"use client";

import { useCallback, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { PositionedNode } from "@/lib/graph";

interface Props {
  nodes: PositionedNode[];
  query: string;
  onQuery: (q: string) => void;
  onPick: (id: string) => void;
  /** Active category filters — the typeahead never offers a hidden ingredient. */
  activeCategories?: Set<string>;
  testId?: string;
}

export default function SearchBar({
  nodes,
  query,
  onQuery,
  onPick,
  activeCategories,
  testId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const trimmed = query.trim();

  // Everything matching the text, before category filters.
  const allMatches = useMemo(() => {
    const q = trimmed.toLowerCase();
    if (!q) return [];
    return nodes
      .filter((n) => n.name.toLowerCase().includes(q))
      .sort((a, b) => (b.pairingCount ?? 0) - (a.pairingCount ?? 0));
  }, [nodes, trimmed]);

  const hiddenByFilters = useMemo(
    () =>
      activeCategories
        ? allMatches.filter((n) => !activeCategories.has(n.category)).length
        : 0,
    [allMatches, activeCategories]
  );

  const results = useMemo(
    () =>
      (activeCategories
        ? allMatches.filter((n) => activeCategories.has(n.category))
        : allMatches
      ).slice(0, 8),
    [allMatches, activeCategories]
  );

  const close = useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open || results.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev + 1) % results.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev - 1 + results.length) % results.length);
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && results[highlightedIndex]) {
            onPick(results[highlightedIndex].id);
          } else {
            onPick(results[0].id);
          }
          close();
          break;
        case "Escape":
          close();
          break;
        case "Tab":
          close();
          break;
      }
    },
    [open, results, highlightedIndex, onPick, close]
  );

  const handleResultClick = (id: string) => {
    onPick(id);
    close();
  };

  const activeOptionId =
    highlightedIndex >= 0 && results[highlightedIndex]
      ? `search-option-${results[highlightedIndex].id}`
      : undefined;

  const showPanel = open && trimmed.length > 0;

  return (
    <div className="relative w-full max-w-md">
      <div className="glass ripple-btn flex items-center gap-3 rounded-full py-3 pl-5 pr-3 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
        <Search size={16} className="shrink-0 text-ash" aria-hidden="true" />
        <input
          data-testid={testId}
          value={query}
          onChange={(e) => {
            onQuery(e.target.value);
            setOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            setOpen(true);
            setHighlightedIndex(-1);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 140)}
          onKeyDown={handleKeyDown}
          placeholder="Search the galaxy…"
          className="w-full bg-transparent font-mono text-[13px] tracking-wide text-bone placeholder:text-ash focus:outline-none"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-activedescendant={activeOptionId}
          aria-expanded={open && results.length > 0}
          role="combobox"
        />
        {query && (
          <button
            onClick={() => {
              onQuery("");
              setHighlightedIndex(-1);
            }}
            className="magnetic rounded-full p-1.5 text-ash hover:bg-white/10 hover:text-bone focus-visible:outline-none"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {showPanel && (
        <div
          id="search-results"
          role="listbox"
          aria-label="Search results"
          className="glass cinematic-reveal absolute top-full z-50 mt-2 w-full overflow-hidden rounded-2xl p-1.5"
        >
          {results.length > 0 ? (
            results.map((r, index) => (
              <button
                key={r.id}
                id={`search-option-${r.id}`}
                role="option"
                aria-selected={index === highlightedIndex}
                onClick={() => handleResultClick(r.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleResultClick(r.id);
                  }
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`search-result flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.07] ${
                  index === highlightedIndex ? "bg-white/[0.07]" : ""
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_12px_currentColor]"
                  style={{ background: r.color, color: r.color }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-grotesk text-sm text-bone" title={r.name}>
                    {r.name}
                  </span>
                  <span className="block truncate font-mono text-[10px] uppercase tracking-[0.18em] text-ash">
                    {r.category} · {r.pairingCount ?? 0} links
                  </span>
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-3" role="status">
              <p className="font-grotesk text-sm text-bone">
                No ingredients match “{trimmed}”
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ash">
                {hiddenByFilters > 0
                  ? `${hiddenByFilters} match${hiddenByFilters === 1 ? "" : "es"} hidden by the category filters`
                  : "Try a shorter word, or search by flavour"}
              </p>
              {hiddenByFilters > 0 && (
                <button
                  onClick={() => {
                    onQuery("");
                    setHighlightedIndex(-1);
                  }}
                  className="mt-2 rounded-full border border-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-bone hover:bg-white/10"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
