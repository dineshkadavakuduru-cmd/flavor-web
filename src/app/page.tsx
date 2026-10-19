"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGraphData } from "@/hooks/useGraphData";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useDeviceProfile } from "@/hooks/useDeviceProfile";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { neighborMap } from "@/lib/graph";
import SearchBar from "@/components/ui/SearchBar";
import CategoryChips from "@/components/ui/CategoryChips";
import DetailPanel from "@/components/ui/DetailPanel";
import ErrorBoundary from "@/components/ErrorBoundary";
import { InfoModal, LoadingScreen, SurpriseButton } from "@/components/ui/Overlays";

/**
 * Set when the canvas chunk itself fails to *fetch* (offline, flaky network,
 * blocker). The loader memoises a rejected import, so remounting the component
 * can never recover it — only a fresh document can re-request the chunk.
 */
let canvasChunkFailed = false;

const GalaxyCanvas = dynamic(
  () =>
    import("@/components/3d/GalaxyCanvas").catch((error) => {
      canvasChunkFailed = true;
      throw error;
    }),
  { ssr: false }
);

/** Guards the reload escalation below so a permanently unreachable chunk cannot
 *  put the page in a reload loop. */
const RELOAD_GUARD_KEY = "flavor-web:reload-after-chunk-failure";

function readReloadGuard() {
  try {
    return Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) ?? "0");
  } catch {
    return 1; // storage unavailable — never escalate
  }
}

function markReloadAttempted() {
  try {
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(readReloadGuard() + 1));
  } catch {
    /* ignore */
  }
}

const ALL = ["protein", "herb", "spice", "vegetable", "fruit", "dairy", "grain", "other"];

// Show the retry/error state if the galaxy isn't ready within this window
// (covers slow Firestore fetch, slow 3D init, or a stalled load).
const LOADING_TIMEOUT_MS = 5000;

/** Query param that carries the selected ingredient, e.g. /?ingredient=basil */
const DEEP_LINK_PARAM = "ingredient";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { nodes, pairings, loading } = useGraphData(refreshKey);
  const isMobile = useIsMobile();
  const isOnline = useOnlineStatus();
  const prefersReducedMotion = useReducedMotion();
  const device = useDeviceProfile(isMobile, prefersReducedMotion);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set(ALL));
  const [announcement, setAnnouncement] = useState("");

  // --- Loading timeout / fallback state -------------------------------------
  const [timedOut, setTimedOut] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // 3D canvas finished initializing (R3F onCreated)
  const [canvasReady, setCanvasReady] = useState(false);
  // Why the canvas is not on screen, when it is not. A single value instead of
  // three booleans so the message and the recovery path cannot disagree:
  //   "canvas"  — render/capability failure, remounting is the fix
  //   "context" — WebGL context lost past the grace window, remounting is the fix
  //   "chunk"   — the 3D engine never downloaded, only a reload can fix it
  const [failure, setFailure] = useState<"canvas" | "context" | "chunk" | null>(null);

  const dataReady = !loading && nodes.length > 0;
  // Overlay stays up until data is loaded AND the 3D canvas has initialized.
  // The canvas mounts behind the opaque overlay as soon as data is ready, so a
  // slow WebGL init can still succeed after the timeout fires; it is keyed by
  // refreshKey so retries remount it and onCreated fires again.
  const galaxyReady = dataReady && canvasReady && !failure;

  // Timer starts on mount / on retry and stops as soon as the galaxy is up —
  // it no longer ticks a setState 4x a second for the life of the page.
  useEffect(() => {
    setTimedOut(false);
    setElapsed(0);
    if (galaxyReady) return;
    const startedAt = Date.now();
    // Test hook: the audit measures the 5s budget from here, not from first
    // paint. On a slow connection the server-rendered overlay is visible long
    // before the JS bundle finishes hydrating, so first paint would make the
    // timeout look like it fired late when it did not.
    (window as Window & { __flavorLoadStartedAt?: number }).__flavorLoadStartedAt = startedAt;
    const tick = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 250);
    const timer = setTimeout(() => setTimedOut(true), LOADING_TIMEOUT_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(timer);
    };
  }, [refreshKey, galaxyReady]);

  const handleCanvasReady = useCallback(() => setCanvasReady(true), []);
  // If the canvas module itself never arrived, the boundary is seeing a download
  // failure, not a WebGL problem — and only a reload can clear it.
  const handleCanvasError = useCallback(
    () => setFailure(canvasChunkFailed ? "chunk" : "canvas"),
    []
  );
  const handleContextLost = useCallback(() => setFailure("context"), []);

  const performRetry = useCallback(
    (allowReload: boolean, userInitiated = false) => {
      // Remounting repairs a crashed canvas (boundary error, lost context) and
      // buys more time on a slow link — but not a chunk that never downloaded.
      //
      // The reload guard stops the *automatic* reconnect path from looping.
      // A click is different: the user is asking again, and the previous
      // reload may simply have happened while still offline. Honouring the
      // click is what makes the button not a silent no-op in that case.
      if (
        allowReload &&
        canvasChunkFailed &&
        !canvasReady &&
        (userInitiated || readReloadGuard() === 0)
      ) {
        markReloadAttempted();
        window.location.reload();
        return;
      }
      setCanvasReady(false);
      setFailure(null);
      setRefreshKey((k) => k + 1); // restarts both the data fetch and the timeout
    },
    [canvasReady]
  );

  // A successful load re-arms the reload escalation for the next session.
  useEffect(() => {
    if (!galaxyReady) return;
    try {
      window.sessionStorage.removeItem(RELOAD_GUARD_KEY);
    } catch {
      /* ignore */
    }
  }, [galaxyReady]);

  // Connectivity came back: retry automatically instead of leaving the user
  // staring at an error that is no longer true.
  //
  // Strictly tied to the offline -> online transition. Retrying on `timedOut`
  // alone made the timeout error flash for a single frame on a slow-but-working
  // link (the retry restarted the clock immediately), so the user never saw it
  // and in-flight downloads were thrown away.
  const wasOffline = useRef(false);
  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    if (!galaxyReady) performRetry(true);
  }, [isOnline, galaxyReady, performRetry]);

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const selected = selectedId ? nodeById.get(selectedId) ?? null : null;

  // ------------------------------------------------------------------ deep links
  // `?ingredient=<id>` is the shareable form of "I am looking at this orb".
  // The requested id is captured on mount, before any state exists, and applied
  // once the graph is in — reading it later would race the URL sync below.
  const requestedId = useRef<string | null>(null);
  useEffect(() => {
    requestedId.current = new URLSearchParams(window.location.search).get(DEEP_LINK_PARAM);
  }, []);

  const deepLinkApplied = useRef(false);
  useEffect(() => {
    if (deepLinkApplied.current || nodes.length === 0) return;
    deepLinkApplied.current = true;
    const wanted = requestedId.current;
    if (wanted && nodeById.has(wanted)) setSelectedId(wanted);
  }, [nodes, nodeById]);

  useEffect(() => {
    // Never write the URL before the deep link has been resolved: on first mount
    // `selectedId` is still null while the graph is loading, and an early sync
    // would delete the very parameter we were asked to honour.
    if (!deepLinkApplied.current) return;
    const url = new URL(window.location.href);
    if (selectedId) url.searchParams.set(DEEP_LINK_PARAM, selectedId);
    else url.searchParams.delete(DEEP_LINK_PARAM);
    const search = url.searchParams.toString();
    const next = `${url.pathname}${search ? `?${search}` : ""}${url.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    // replaceState, not pushState: orbiting is not navigation, and every click
    // adding a history entry makes Back useless. The URL still updates, so the
    // view stays shareable and survives a reload.
    if (next !== current) window.history.replaceState({ [DEEP_LINK_PARAM]: selectedId }, "", next);
  }, [selectedId, dataReady]);

  // Honour Back/Forward and URL-bar edits.
  useEffect(() => {
    const onPopState = () => {
      const wanted = new URLSearchParams(window.location.search).get(DEEP_LINK_PARAM);
      setSelectedId(wanted && nodeById.has(wanted) ? wanted : null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [nodeById]);

  // -------------------------------------------------------- keyboard navigation
  const neighbors = useMemo(() => neighborMap(pairings), [pairings]);
  // Most-connected first: a sensible "first stop" and a sane fallback ring for
  // ingredients that have no pairings at all.
  const keyboardOrder = useMemo(
    () =>
      [...nodes]
        .sort((a, b) => (b.pairingCount ?? 0) - (a.pairingCount ?? 0))
        .map((n) => n.id),
    [nodes]
  );

  const ringFor = useCallback(
    (id: string | null) => {
      if (!id) return keyboardOrder;
      const linked = neighbors.get(id);
      const ring = linked ? Array.from(linked.keys()) : [];
      return ring.length ? ring : keyboardOrder;
    },
    [neighbors, keyboardOrder]
  );

  const stepSelection = useCallback(
    (dir: 1 | -1) => {
      if (keyboardOrder.length === 0) return;
      if (!selectedId) {
        setSelectedId(keyboardOrder[0]);
        return;
      }
      const ring = ringFor(selectedId);
      const i = ring.indexOf(selectedId);
      const next = i === -1 ? ring[0] : ring[(i + dir + ring.length) % ring.length];
      if (next) setSelectedId(next);
    },
    [keyboardOrder, ringFor, selectedId]
  );

  const handleGalaxyKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          stepSelection(1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          stepSelection(-1);
          break;
        case "Home":
          e.preventDefault();
          if (keyboardOrder[0]) setSelectedId(keyboardOrder[0]);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (!selectedId && keyboardOrder[0]) setSelectedId(keyboardOrder[0]);
          break;
        case "Escape":
          if (selectedId) {
            e.preventDefault();
            setSelectedId(null);
          }
          break;
      }
    },
    [stepSelection, keyboardOrder, selectedId]
  );

  // Screen readers get the same news the camera flight delivers visually.
  useEffect(() => {
    if (!selected) {
      setAnnouncement("");
      return;
    }
    const count = pairings.filter(
      (p) => p.ingredientA === selected.id || p.ingredientB === selected.id
    ).length;
    setAnnouncement(
      `${selected.name} selected, ${count} pairing${count === 1 ? "" : "s"}.`
    );
  }, [selected, pairings]);

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

  const noCategories = activeCategories.size === 0;

  const errorMessage =
    failure === "canvas"
      ? "The flavor galaxy failed to render (WebGL may be unavailable)."
      : failure === "context"
        ? "The 3D context was lost and did not come back. Retry to rebuild the galaxy."
        : !isOnline
          ? "You are offline. The galaxy loads from cache once it has been visited."
          : failure === "chunk"
            ? "The 3D engine could not be downloaded. Retry to fetch it again."
            : timedOut
              ? "The flavor galaxy took too long to condense."
              : false;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-void-950">
      <div
        // Keyboard entry point for the graph itself: orbs are WebGL instances
        // and cannot be tabbed to, so the canvas is a single focusable surface
        // with arrow-key navigation between an ingredient and its pairings.
        // Not focusable while the loading/error overlay is covering it.
        tabIndex={galaxyReady ? 0 : -1}
        role="application"
        aria-label="Flavor galaxy. Arrow keys move to an ingredient or its pairings, Enter selects, Escape deselects."
        aria-describedby="galaxy-help"
        onKeyDown={handleGalaxyKeyDown}
        className="absolute inset-0"
      >
        {dataReady && !failure && (
          <ErrorBoundary key={refreshKey} fallback={null} onError={handleCanvasError}>
            <GalaxyCanvas
              key={refreshKey}
              nodes={nodes}
              pairings={pairings}
              selectedId={selectedId}
              searchQuery={query}
              activeCategories={activeCategories}
              onSelect={setSelectedId}
              isMobile={isMobile}
              dpr={device.dpr}
              allowPostProcessing={device.allowPostProcessing}
              reducedMotion={prefersReducedMotion}
              onReady={handleCanvasReady}
              onContextLost={handleContextLost}
            />
          </ErrorBoundary>
        )}
        {!galaxyReady && (
          <LoadingScreen
            elapsed={elapsed}
            error={errorMessage}
            onRetry={() => performRetry(true, true)}
          />
        )}
      </div>

      <p id="galaxy-help" className="sr-only">
        Use the arrow keys to move between an ingredient and its pairings, Enter to select
        the most connected ingredient, and Escape to deselect.
      </p>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex flex-col items-center gap-3 px-4 pt-4 md:pt-6">
        <div className="pointer-events-auto flex w-full max-w-3xl flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 animate-pulse-slow rounded-full bg-ember shadow-[0_0_16px_#ffb347]" />
            <h1 className="label-shadow font-mono text-[11px] uppercase tracking-[0.34em] text-bone/90">
              Flavor <span className="aurora-text font-semibold">Web</span>
            </h1>
          </div>
          <SearchBar
            nodes={nodes}
            query={query}
            onQuery={setQuery}
            onPick={setSelectedId}
            activeCategories={activeCategories}
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

        {noCategories && (
          <p
            role="status"
            className="label-shadow pointer-events-none font-mono text-[10px] uppercase tracking-[0.16em] text-bone"
          >
            Every category is hidden — turn one back on to see the galaxy
          </p>
        )}
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
          <span className="label-shadow hidden font-mono text-[10px] uppercase tracking-[0.2em] text-ash sm:block">
            {dataReady ? `${nodes.length} orbs · ${pairings.length} threads` : "—"}
          </span>
        </div>
        <SurpriseButton onClick={surprise} />
      </footer>

      {selected && !isMobile && (
        <div className="pointer-events-auto absolute left-4 top-1/2 z-30 hidden max-w-md -translate-y-1/2 lg:block">
          <p key={`k-${selected.id}`} className="cinematic-reveal">
            <span
              className="label-shadow font-mono text-[11px] uppercase tracking-[0.3em]"
              style={{ color: selected.color }}
            >
              Now entering orbit
            </span>
            <span className="font-display mt-2 block text-4xl font-semibold leading-[1.02] text-bone/95 [overflow-wrap:anywhere] xl:text-6xl">
              {selected.name}
            </span>
          </p>
        </div>
      )}
    </main>
  );
}
