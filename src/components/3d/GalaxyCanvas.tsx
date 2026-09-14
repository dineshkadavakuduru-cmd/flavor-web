"use client";

import { Canvas } from "@react-three/fiber";
import FlavorGalaxy from "./FlavorGalaxy";
import type { Pairing } from "@/types";
import type { PositionedNode } from "@/lib/graph";

interface Props {
  nodes: PositionedNode[];
  onReady?: () => void;
  pairings: Pairing[];
  selectedId: string | null;
  searchQuery: string;
  activeCategories: Set<string>;
  onSelect: (id: string | null) => void;
  isMobile: boolean;
}

export default function GalaxyCanvas({ onReady, ...props }: Props) {
  return (
    <Canvas
      dpr={props.isMobile ? [1, 1.5] : [1, 2]}
      camera={{ position: [0, 9, 34], fov: 52, near: 0.1, far: 400 }}
      gl={{ antialias: !props.isMobile, alpha: false, powerPreference: "high-performance" }}
      onPointerMissed={() => props.onSelect(null)}
      onCreated={() => onReady?.()}
    >
      <FlavorGalaxy {...props} />
    </Canvas>
  );
}
