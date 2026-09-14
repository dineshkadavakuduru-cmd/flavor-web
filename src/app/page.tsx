"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGraphData } from "@/hooks/useGraphData";
import { useIsMobile } from "@/hooks/useIsMobile";
import SearchBar from "@/components/ui/SearchBar";
import CategoryChips from "@/components/ui/CategoryChips";
import DetailPanel from "@/components/ui/DetailPanel";
import { InfoModal, LoadingScreen, SurpriseButton } from "@/components/ui/Overlays";

const GalaxyCanvas = dynamic(() => import("@/components/3d/GalaxyCanvas"), {
  ssr: false,
});

const ALL = ["protein", "herb", "spice", "vegetable", "fruit", "dairy", "grain", "other"];

// Max time to wait before showing a timeout error on the loading overlay
const LOADING_TIMEOUT_MS = 12000;

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { nodes, pairings, loading } = useGraphData(refreshKey);
  const isMobile = useIsMobile();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set(ALL));

  // Timeout guard: if data or 3D init takes too long, show error state
  const [timedOut, setTimedOut] = useState(false);
  const mountStart = useRef<number>(Date.now());

  useEffect(() => {
    mountStart.current = Date.now();
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, LOADING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  // Reset the timeout whenever loading completes
  useEffect(() => {
    if (!loading && nodes.length > 0 && !timedOut) {
      // Galaxy is ready; no more timeout needed
    }
  }, [loading, nodes, timedOut]);

  const handleRetry = () => {
    setTimedOut(false);
    setRefreshKey((k) => k + 1);
  };

  const elapsed = Date.now() - mountStart.current;

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const selected = selectedId ? nodeById.get(selectedId) ?? null : null;

  const toggleCategory = (c: string) =>
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  const surprise = () => {
    const eligible = nodes.filter((n) => (n.pairingCount ?? 0) >= 3);
    if (!eligible.length) return;
    const pick = eligible[Math.floor(Math.random() * eligible.length)];
    setSelectedId(pick.id);
    setQuery("");
  };

  const galaxyReady = !loading && nodes.length > 0;
  const showError = timedOut && !galaxyReady;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-void-950">
      <div className="absolute inset-0">
        {showError ? (
          <LoadingScreen error={true} onRetry={handleRetry} />
        ) : !galaxyReady ? (
          <LoadingScreen elapsed={elapsed} />
        ) : (
          <GalaxyCanvas
            nodes={nodes}
            pairings={pairings}
            selectedId={selectedId}
            searchQuery={query}
            activeCategories={activeCategories}
            onSelect={setSelectedId}
            isMobile={isMobile}
          />
        )}
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex flex-col items-center gap-3 px-4 pt-4 md:pt-6">
        <div className="pointer-events-auto flex w-full max-w-3xl flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 animate-pulse-slow rounded-full bg-ember shadow-[0_0_16px_#ffb347]" />
            <h1 className="font-mono text-[11px] uppercase tracking-[0.34em] text-bone/90">
              Flavor <span className="aurora-text font-semibold">Web</span>
            </h1>
          </div>
          <SearchBar
            nodes={nodes}
            query={query}
            onQuery={setQuery}
            onPick={setSelectedId}
            testId="search-input"
          />
        </div>

        {/* Category chips — single horizontal scroll row, visible on all breakpoints */}
        <div className="pointer-events-auto w-full max-w-3xl overflow-x-auto">
          <div className="flex w-max items-center justify-center gap-2 px-1 py-1.5">
            <CategoryChips
              active={activeCategories}
              onToggle={toggleCategory}
              onReset={() => setActiveCategories(new Set(ALL))}
              testId="category-chips"
            />
          </div>
        </div>
      </header>

      {/* Desktop detail panel — only render when there's a selection */}
      {selected && (
        <div className="pointer-events-none absolute bottom-24 right-4 top-36 z-40 hidden w-[380px] max-w-[calc(100vw-2rem)] md:block">
          <DetailPanel node={selected} pairings={pairings} nodeById={nodeById} onClose={() => setSelectedId(null)} onPick={setSelectedId} />
        </div>
      )}

      {/* Mobile detail panel */}
      {selected && isMobile && (
        <div className="pointer-events-auto absolute inset-x-3 bottom-20 z-50 md:hidden">
          <DetailPanel node={selected} pairings={pairings} nodeById={nodeById} onClose={() => setSelectedId(null)} onPick={setSelectedId} />
        </div>
      )}

      <footer className="absolute inset-x-0 bottom-0 z-40 flex items-end justify-between gap-3 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <InfoModal />
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-ash sm:block">
            {galaxyReady ? `${nodes.length} orbs · ${pairings.length} threads` : "—"}
          </span>
        </div>
        <SurpriseButton onClick={surprise} />
      </footer>

      {selected && !isMobile && (
        <div className="pointer-events-auto absolute left-4 top-1/2 z-30 hidden max-w-md -translate-y-1/2 lg:block">
          <p key={`k-${selected.id}`} className="cinematic-reveal">
            <span className="font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: selected.color }}>
              Now entering orbit
            </span>
            <span className="font-display mt-2 block text-6xl font-semibold leading-[0.95] text-bone/95">
              {selected.name}
            </span>
          </p>
        </div>
      )}
    </main>
  );
}
