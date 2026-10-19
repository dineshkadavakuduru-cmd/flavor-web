import { useEffect, useState } from "react";

export interface DeviceProfile {
  /** Weak CPU/GPU, metered network or a user asking for less work. */
  lowPower: boolean;
  /** DPR range handed to the R3F <Canvas dpr>. */
  dpr: [number, number];
  /** Bloom + antialiasing are the first things to go. */
  allowPostProcessing: boolean;
}

const HIGH: DeviceProfile = { lowPower: false, dpr: [1, 1.75], allowPostProcessing: true };
const HIGH_MOBILE: DeviceProfile = { lowPower: false, dpr: [1, 1.5], allowPostProcessing: false };
const LOW: DeviceProfile = { lowPower: true, dpr: [1, 1.25], allowPostProcessing: false };

/**
 * Picks render quality from device hints instead of a mobile/desktop binary.
 *
 * DPR is capped at 1.75 on desktop rather than 2: on a 4K/Retina display the
 * uncapped buffer is ~4x the pixels of the CSS size, which is the single most
 * expensive thing about this scene, and bloom is what makes it hurt.
 * `prefers-reduced-motion` is treated as a request for a cheaper frame, so the
 * 3D scene stops moving *and* stops paying for postprocessing.
 */
export function useDeviceProfile(isMobile: boolean, prefersReducedMotion: boolean): DeviceProfile {
  const [lowPower, setLowPower] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean; effectiveType?: string };
      hardwareConcurrency?: number;
    };
    const cores = nav.hardwareConcurrency ?? 8;
    const memory = nav.deviceMemory ?? 8;
    const saveData = nav.connection?.saveData === true;
    const slowNet = ["slow-2g", "2g", "3g"].includes(nav.connection?.effectiveType ?? "");
    setLowPower(cores <= 4 || memory <= 4 || saveData || slowNet);
  }, []);

  if (lowPower || prefersReducedMotion) return LOW;
  return isMobile ? HIGH_MOBILE : HIGH;
}
