"use client";

import { Dices, Info, Loader2, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";

export function SurpriseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass ripple-btn magnetic group flex items-center gap-2.5 rounded-full py-3 pl-4 pr-5"
      style={{ boxShadow: "0 0 24px rgba(255,179,71,0.18), 0 0 40px rgba(0,0,0,0.5)" }}
    >
      <Dices size={16} className="text-ember transition-transform duration-300 group-hover:rotate-180" />
      <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-bone">Surprise me</span>
    </button>
  );
}

export function InfoModal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glass magnetic flex h-11 w-11 items-center justify-center rounded-full text-ash hover:text-bone"
        aria-label="About Flavor Web"
      >
        <Info size={17} />
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="glass cinematic-reveal max-w-md rounded-2xl p-7"
            style={{ borderTop: "3px solid #ffb347" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-display text-2xl text-bone">A living constellation of flavor</h3>
              <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-ash hover:bg-white/10 hover:text-bone" aria-label="Close">
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
    const message = typeof error === "string" && error ? error : "The flavor galaxy took too long to condense. Something went wrong.";
    return (
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-6 bg-void-950">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
            <X className="text-red-400" size={28} />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ash">
            {message}
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="glass ripple-btn magnetic flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-bone"
          >
            <RefreshCw size={14} className="text-ember" />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 bg-void-950">
      <Loader2 className="animate-spin text-ember" size={28} />
      <div className="flex flex-col items-center gap-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-ash">Condensing flavor galaxy</p>
        {seconds > 0 && (
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ash/60">
            ({seconds}s elapsed)
          </span>
        )}
      </div>
    </div>
  );
}
