"use client";

import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import { Search, X } from "lucide-react";
import type { PositionedNode } from "@/lib/graph";

interface Props {
  nodes: PositionedNode[];
  query: string;
  onQuery: (q: string) => void;
  onPick: (id: string) => void;
  inputRef: RefObject<HTMLInputElement>;
  loading: boolean;
  /** Active category filters — the typeahead never offers a hidden ingredient. */
  activeCategories?: Set<string>;
  testId?: string;
}

export default function SearchBar({
  nodes,
  query,
  onQuery,
  onPick,
  inputRef,
  loading,
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
      if (e.key === "Escape" || e.key === "Tab") {
        if (open && e.key === "Escape") e.preventDefault();
        close();
        return;
      }
      if (results.length === 0 || e.nativeEvent.isComposing) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setOpen(true);
          setHighlightedIndex((prev) => (prev + 1) % results.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setOpen(true);
          setHighlightedIndex((prev) => prev < 0 ? results.length - 1 : (prev - 1 + results.length) % results.length);
          break;
        case "Enter":
          if (!open) return;
          e.preventDefault();
          if (highlightedIndex >= 0 && results[highlightedIndex]) {
            onPick(results[highlightedIndex].id);
          } else {
            onPick(results[0].id);
          }
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
    open && highlightedIndex >= 0 && results[highlightedIndex]
      ? `search-option-${results[highlightedIndex].id}`
      : undefined;

  const showPanel = open && trimmed.length > 0;

  useEffect(() => {
    if (activeOptionId) document.getElementById(activeOptionId)?.scrollIntoView({ block: "nearest" });
  }, [activeOptionId]);

  return (
    <div
      className="relative w-full max-w-md"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) close();
      }}
    >
      <div className="glass flex items-center gap-3 rounded-full py-2 pl-5 pr-3 shadow-[0_8px_40px_rgba(0,0,0,0.5)] focus-within:ring-2 focus-within:ring-ember">
        <Search size={16} className="shrink-0 text-ash" aria-hidden="true" />
        <input
          ref={inputRef}
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
          onClick={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search the galaxy…"
          className="min-h-8 w-full bg-transparent font-mono text-base tracking-wide text-bone placeholder:text-ash focus:outline-none md:text-sm"
          autoComplete="off"
          enterKeyHint="search"
          aria-label="Search ingredients"
          aria-autocomplete="list"
          aria-controls={showPanel ? "search-options" : undefined}
          aria-activedescendant={activeOptionId}
          aria-expanded={showPanel}
          role="combobox"
        />
        {query && (
          <button
            onClick={() => {
              onQuery("");
              setHighlightedIndex(-1);
              inputRef.current?.focus();
            }}
            className="magnetic rounded-full p-2 text-ash hover:bg-white/10 hover:text-bone"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {showPanel && (
        <div
          id="search-results"
          className="search-results glass absolute top-full z-50 mt-2 w-full overflow-y-auto rounded-2xl p-1.5"
        >
          <div id="search-options" role="listbox" aria-label="Search results">
            {results.length > 0 &&
              results.map((r, index) => (
                <button
                  key={r.id}
                  id={`search-option-${r.id}`}
                  role="option"
                  tabIndex={-1}
                  aria-selected={index === highlightedIndex}
                  onClick={() => handleResultClick(r.id)}
                  onMouseDown={(e) => e.preventDefault()}
                  className={`search-result flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.07] ${
                    index === highlightedIndex ? "bg-white/10 ring-1 ring-inset ring-ember" : ""
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
              ))}
          </div>
          {results.length === 0 && (
            <div className="px-3 py-3" role="status">
              <p className="font-grotesk text-sm text-bone">
                {loading ? "Loading ingredients…" : <>No ingredients match “{trimmed}”</>}
              </p>
              {!loading && (
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ash">
                  {hiddenByFilters > 0
                    ? `${hiddenByFilters} match${hiddenByFilters === 1 ? "" : "es"} hidden by the category filters`
                    : "Try a shorter word, or search by flavour"}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
