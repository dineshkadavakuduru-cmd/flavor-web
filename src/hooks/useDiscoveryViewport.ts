import { useEffect, type RefObject } from "react";

export function useDiscoveryViewport(container: RefObject<HTMLElement>) {
  useEffect(() => {
    const element = container.current;
    const viewport = window.visualViewport;
    if (!element || !viewport) return;

    const update = () => {
      // Pinch zoom also shrinks the visual viewport. Let the user pan the
      // zoomed page normally and only adjust the controls at the base scale.
      if (Math.abs(viewport.scale - 1) > 0.01) return;
      const hiddenHeight = element.clientHeight - viewport.height;
      const keyboardOpen = hiddenHeight > 120;
      const top = keyboardOpen ? Math.max(0, viewport.offsetTop) : 0;
      element.dataset.keyboardOpen = String(keyboardOpen);
      element.style.setProperty("--discovery-top", `${top}px`);
      element.style.setProperty("--discovery-bottom", `${Math.max(0, hiddenHeight - top)}px`);
      element.style.setProperty("--discovery-height", `${viewport.height}px`);
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [container]);
}
