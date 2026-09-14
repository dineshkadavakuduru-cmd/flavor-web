"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGraphData } from "@/hooks/useGraphData";
import { useIsMobile } from "@/hooks/useIsMobile";
import SearchBar from "@/components/ui/SearchBar";
import CategoryChips from "@/components/ui/CategoryChips";
import DetailPanel from "@/components/ui/DetailPanel";
import ErrorBoundary from "@/components/ErrorBoundary";
import { InfoModal, LoadingScreen, SurpriseButton } from "@/components/ui/Overlays";

const GalaxyCanvas = dynamic(() => import("@/components/3d/GalaxyCanvas"), {
  ssr: false,
});

const ALL = ["protein", "herb", "spice", "vegetable", "fruit", "dairy", "grain", "other"];

// Show the retry/error state if the galaxy isn't ready within this window
// (covers slow Firestore fetch, slow 3D init, or a stalled load).
const LOADING_TIMEOUT_MS = 5000;

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { nodes, pairings, loading } = useGraphData(refreshKey);
  const isMobile = useIsMobile();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set(ALL));

  // --- Loading timeout / fallback state -------------------------------------
  const [timedOut, setTimedOut] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // 3D canvas finished initializing (R3F onCreated)
  const [canvasReady, setCanvasReady] = useState(false);
  // 3D canvas crashed (caught by ErrorBoundary) — show the same error state
  const [canvasError, setCanvasError] = useState(false);

  // Timer starts on mount and restarts on every retry
  useEffect(() => {
    setTimedOut(false);
    setElapsed(0);
    const startedAt = Date.now();
    const tick = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 250);
    const timer = setTimeout(() => setTimedOut(true), LOADING_TIMEOUT_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(timer);
    };
  }, [refreshKey]);

  // Fires when the R3F canvas has initialized (WebGL context created)
  const handleCanvasReady = useCallback(() => setCanvasReady(true), []);
  // Fires if the 3D canvas throws during render
  const handleCanvasError = useCallback(() => setCanvasError(true), []);

  const handleRetry = useCallback(() => {
    setCanvasReady(false);
    setCanvasError(false);
    setRefreshKey((k) => k + 1); // restarts both the data fetch and the timeout
  }, []);

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

  const dataReady = !loading && nodes.length > 0;
  // Overlay stays up until data is loaded AND the 3D canvas has initialized.
  // The canvas mounts behind the opaque overlay as soon as data is ready, so a
  // slow WebGL init can still succeed after the timeout fires; it is keyed by
  // refreshKey so retries remount it and onCreated fires again.
  const galaxyReady = dataReady && canvasReady && !canvasError;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-void-950">
      <div className="absolute inset-0">
        {dataReady && !canvasError && (
          <ErrorBoundary fallback={null} onError={handleCanvasError}>
            <GalaxyCanvas
              key={refreshKey}
              nodes={nodes}
              pairings={pairings}
              selectedId={selectedId}
              searchQuery={query}
              activeCategories={activeCategories}
              onSelect={setSelectedId}
              isMobile={isMobile}
              onReady={handleCanvasReady}
            />
          </ErrorBoundary>
        )}
        {!galaxyReady && (
          <LoadingScreen
            elapsed={elapsed}
            error={
              canvasError
                ? "The flavor galaxy failed to render (WebGL may be unavailable)."
                : timedOut
                  ? "The flavor galaxy took too long to condense."
                  : false
            }
            onRetry={handleRetry}
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

      {/* Desktop detail panel — only render when there's a selection (keeps it out of SSR output) */}
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
            {dataReady ? `${nodes.length} orbs · ${pairings.length} threads` : "—"}
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
