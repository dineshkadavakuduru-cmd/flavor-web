"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { PositionedNode } from "@/lib/graph";

interface Props {
  nodes: PositionedNode[];
  query: string;
  onQuery: (q: string) => void;
  onPick: (id: string) => void;
  testId?: string;
}

export default function SearchBar({ nodes, query, onQuery, onPick, testId }: Props) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const resultsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return nodes
      .filter((n) => n.name.toLowerCase().includes(q))
      .sort((a, b) => (b.pairingCount ?? 0) - (a.pairingCount ?? 0))
      .slice(0, 8);
  }, [nodes, query]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
          setOpen(false);
          setHighlightedIndex(-1);
        }
        break;
      case "Escape":
        setOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
      case "Tab":
        setOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  }, [open, results, highlightedIndex, onPick]);

  const handleResultClick = (id: string) => {
    onPick(id);
    setOpen(false);
    setHighlightedIndex(-1);
  };

  const handleResultKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPick(results[index].id);
      setOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="glass ripple-btn flex items-center gap-3 rounded-full py-3 pl-5 pr-3 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
        <Search size={16} className="shrink-0 text-ash" />
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
          onBlur={() => setTimeout(() => setOpen(false), 140)}
          onKeyDown={handleKeyDown}
          placeholder="Search the galaxy…"
          className="w-full bg-transparent font-mono text-[13px] tracking-wide text-bone placeholder:text-ash/70 focus:outline-none"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-expanded={open && results.length > 0}
          role="combobox"
        />
        {query && (
          <button
            onClick={() => onQuery("")}
            className="magnetic rounded-full p-1.5 text-ash hover:bg-white/10 hover:text-bone focus-visible:outline-none"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div
          ref={resultsRef}
          id="search-results"
          role="listbox"
          className="glass cinematic-reveal absolute top-full z-50 mt-2 w-full overflow-hidden rounded-2xl p-1.5"
        >
          {results.map((r, index) => (
            <button
              key={r.id}
              role="option"
              aria-selected={index === highlightedIndex}
              onClick={() => handleResultClick(r.id)}
              onKeyDown={(e) => handleResultKeyDown(e, index)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`search-result flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.07] ${index === highlightedIndex ? "bg-white/[0.07]" : ""}`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_12px_currentColor]"
                style={{ background: r.color, color: r.color }}
                aria-hidden="true"
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
