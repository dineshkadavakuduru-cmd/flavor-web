"use client";

import { useCallback, useEffect, useRef } from "react";
import { Canvas, type RootState } from "@react-three/fiber";
import FlavorGalaxy from "./FlavorGalaxy";
import type { Pairing } from "@/types";
import type { PositionedNode } from "@/lib/graph";

interface Props {
  nodes: PositionedNode[];
  onReady?: () => void;
  /** WebGL context was lost and did not come back within the grace window. */
  onContextLost?: () => void;
  pairings: Pairing[];
  selectedId: string | null;
  searchQuery: string;
  activeCategories: Set<string>;
  onSelect: (id: string | null) => void;
  isMobile: boolean;
  /** DPR range from the device profile (low-power devices get a tighter cap). */
  dpr: [number, number];
  allowPostProcessing: boolean;
  reducedMotion: boolean;
}

/**
 * How long a lost WebGL context gets to come back on its own before we declare
 * failure. The browser does deliver `webglcontextrestored` for transient losses
 * (driver reset, GPU switch, tab backgrounded on Android), and three.js rebuilds
 * its internal state when it does.
 */
const CONTEXT_LOSS_GRACE_MS = 3000;
const CONTEXT_LISTENER_FLAG = "__flavorWebContextListeners";

export default function GalaxyCanvas({
  onReady,
  onContextLost,
  dpr,
  allowPostProcessing,
  reducedMotion,
  ...props
}: Props) {
  const graceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<RootState | null>(null);

  const clearGrace = useCallback(() => {
    if (graceTimer.current) {
      clearTimeout(graceTimer.current);
      graceTimer.current = null;
    }
  }, []);

  useEffect(() => clearGrace, [clearGrace]);

  const handleCreated = useCallback(
    (state: RootState) => {
      rootRef.current = state;
      const el = state.gl.domElement as HTMLCanvasElement & {
        [CONTEXT_LISTENER_FLAG]?: boolean;
      };

      // React StrictMode can invoke onCreated twice for the same element.
      if (!el[CONTEXT_LISTENER_FLAG]) {
        el[CONTEXT_LISTENER_FLAG] = true;

        el.addEventListener("webglcontextlost", (event) => {
          // Without preventDefault the context is gone for good; with it the
          // browser is allowed to restore and three.js reinitialises.
          event.preventDefault();
          // Stop the loop imperatively — deliberately NOT via React state.
          // Re-rendering the scene while the context is dead makes
          // @react-three/postprocessing rebuild its composer, and
          // `EffectComposer.addPass` reads
          // `renderer.getContext().getContextAttributes().alpha`, which is null
          // on a lost context and throws. That exception reached the error
          // boundary and turned a recoverable loss into a permanent failure.
          rootRef.current?.setFrameloop("never");
          clearGrace();
          graceTimer.current = setTimeout(() => {
            graceTimer.current = null;
            onContextLost?.();
          }, CONTEXT_LOSS_GRACE_MS);
        });

        el.addEventListener("webglcontextrestored", () => {
          clearGrace();
          rootRef.current?.setFrameloop("always");
        });
      }

      onReady?.();
    },
    [onReady, onContextLost, clearGrace]
  );

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 9, 34], fov: 52, near: 0.1, far: 400 }}
      gl={{
        antialias: allowPostProcessing && !props.isMobile,
        alpha: false,
        powerPreference: allowPostProcessing ? "high-performance" : "default",
      }}
      // Drop resolution instead of framerate when the machine can't keep up.
      performance={{ min: 0.5, max: 1, debounce: 200 }}
      onPointerMissed={() => props.onSelect(null)}
      onCreated={handleCreated}
    >
      <FlavorGalaxy
        {...props}
        allowPostProcessing={allowPostProcessing}
        reducedMotion={reducedMotion}
      />
    </Canvas>
  );
}
