"use client";

import { Dices, Info, Loader2, RefreshCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function SurpriseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass ripple-btn magnetic group flex items-center gap-2.5 rounded-full py-3 pl-4 pr-5 focus-visible:outline-none"
      style={{ boxShadow: "0 0 24px rgba(255,179,71,0.18), 0 0 40px rgba(0,0,0,0.5)" }}
    >
      <Dices size={16} className="text-ember transition-transform duration-300 group-hover:rotate-180" aria-hidden="true" />
      <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-bone">Surprise me</span>
    </button>
  );
}

export function InfoModal() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape closes, and focus lands on the close button so keyboard users are
  // never dropped back into the canvas without a way out.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glass magnetic flex h-11 w-11 items-center justify-center rounded-full text-ash hover:text-bone"
        aria-label="About Flavor Web"
        aria-haspopup="dialog"
      >
        <Info size={17} />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="glass cinematic-reveal max-h-[85dvh] max-w-md overflow-y-auto scroll-slim rounded-2xl p-7"
            style={{ borderTop: "3px solid #ffb347" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 id="about-title" className="font-display text-2xl text-bone">
                A living constellation of flavor
              </h3>
              <button
                ref={closeRef}
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-ash hover:bg-white/10 hover:text-bone"
                aria-label="Close about dialog"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-3 font-grotesk text-sm leading-relaxed text-bone/75">
              Every orb is an ingredient. Every thread is a pairing.{" "}
              <span className="text-bone">Thick gold threads are classics</span> (tomato × basil),{" "}
              <span className="text-bone">thin silver threads are lab experiments</span> (strawberry × black pepper).
            </p>
            <p className="mt-3 font-grotesk text-sm leading-relaxed text-bone/75">
              Search or click an orb to fly to it. Dim the galaxy with category chips. Hit surprise when you are hungry for an accident.
            </p>
            <p className="mt-3 font-grotesk text-sm leading-relaxed text-bone/75">
              Keyboard: focus the galaxy and use the arrow keys to step through an ingredient&rsquo;s
              pairings, Enter to fly, Escape to pull back out.
            </p>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ash">
              Hand-curated · no external API
            </p>
          </div>
        </div>
      )}
    </>
  );
}

/** Full-screen loading overlay with a built-in timeout.
 *  Props:
 *    - elapsed?: number (ms to show in the "still loading" message)
 *    - error?: boolean | string  — true means a timeout/failure occurred
 *    - onRetry?: () => void      — retry handler shown in the error state
 **/
export function LoadingScreen({
  elapsed,
  error = false,
  onRetry,
}: {
  elapsed?: number;
  error?: boolean | string;
  onRetry?: () => void;
}) {
  // Human-readable elapsed time for the still-loading state
  const seconds = elapsed !== undefined ? Math.floor(elapsed / 1000) : 0;

  if (error) {
    const message =
      typeof error === "string" && error
        ? error
        : "The flavor galaxy took too long to condense. Something went wrong.";
    return (
      <div
        data-testid="loading-error"
        className="fixed inset-0 z-[65] flex flex-col items-center justify-center gap-6 bg-void-950 px-6"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
            <X className="text-red-400" size={28} aria-hidden="true" />
          </div>
          <p className="max-w-md text-center font-mono text-[11px] uppercase leading-relaxed tracking-[0.18em] text-ash">
            {message}
          </p>
        </div>
        {onRetry && (
          <button
            data-testid="retry-button"
            onClick={onRetry}
            className="glass ripple-btn magnetic flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-bone"
          >
            <RefreshCw size={14} className="text-ember" aria-hidden="true" />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid="loading-screen"
      className="fixed inset-0 z-[65] flex flex-col items-center justify-center gap-5 bg-void-950 px-6"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="animate-spin text-ember" size={28} aria-hidden="true" />
      <div className="flex flex-col items-center gap-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-ash">Condensing flavor galaxy</p>
        {seconds > 0 && (
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ash">
            {seconds}s elapsed
          </span>
        )}
        {seconds >= 3 && (
          <span className="mt-1 max-w-xs text-center font-grotesk text-xs leading-relaxed text-ash">
            Still working — the first load downloads the 3D engine.
          </span>
        )}
      </div>
    </div>
  );
}
