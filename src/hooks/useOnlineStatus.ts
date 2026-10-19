import { useEffect, useState } from "react";

/**
 * Tracks connectivity so the loading fallback can tell "slow network" apart
 * from "you are offline, retrying will not help until the browser reconnects".
 * Starts as `true` to match the server render and avoid a hydration mismatch.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return isOnline;
}
