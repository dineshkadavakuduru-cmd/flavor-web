import { useEffect, useState } from "react";

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () =>
      setIsMobile(
        window.innerWidth < breakpoint ||
          /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
      );
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}
