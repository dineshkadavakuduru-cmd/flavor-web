import { useEffect, useState } from "react";

/**
 * The CSS media query in globals.css only neutralises CSS animation — the WebGL
 * scene keeps spinning, bobbing and blooming regardless. This exposes the same
 * preference to the renderer so motion can be toned down there too
 * (no idle spin, no node bob, no bloom, instant camera flights).
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return reduced;
}
