"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Stars, OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { Pairing } from "@/types";
import { neighborMap, type PositionedNode } from "@/lib/graph";
import { easeInOutCubic } from "@/lib/utils";

interface GalaxyProps {
  nodes: PositionedNode[];
  pairings: Pairing[];
  selectedId: string | null;
  searchQuery: string;
  activeCategories: Set<string>;
  onSelect: (id: string | null) => void;
  isMobile: boolean;
}

const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();

function dimFactor(
  node: PositionedNode,
  selectedId: string | null,
  neighbors: Map<string, Map<string, Pairing>>,
  searchQuery: string,
  activeCategories: Set<string>
) {
  if (!activeCategories.has(node.category)) return 0.08;
  const q = searchQuery.trim().toLowerCase();
  if (q && !node.name.toLowerCase().includes(q) && !selectedId) return 0.12;
  if (!selectedId) return 1;
  if (node.id === selectedId) return 1;
  if (neighbors.get(selectedId)?.has(node.id)) return 1;
  return 0.1;
}

function NodeField({
  nodes,
  pairings,
  selectedId,
  searchQuery,
  activeCategories,
  spinGroup,
  onSelect,
}: GalaxyProps & { spinGroup: React.RefObject<THREE.Group> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const haloRef = useRef<THREE.InstancedMesh>(null!);
  const neighbors = useMemo(() => neighborMap(pairings), [pairings]);
  const indexById = useMemo(() => new Map(nodes.map((n, i) => [n.id, i])), [nodes]);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    nodes.forEach((n, i) => {
      tmpColor.set(n.color);
      meshRef.current.setColorAt(i, tmpColor);
    });
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [nodes]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const mesh = meshRef.current;
    if (!mesh) return;
    nodes.forEach((n, i) => {
      const dim = dimFactor(n, selectedId, neighbors, searchQuery, activeCategories);
      const isSel = n.id === selectedId;
      const isNeighbor = selectedId ? neighbors.get(selectedId)?.has(n.id) : false;
      const base = 0.55 + Math.min(n.pairingCount ?? 0, 12) * 0.055;
      const pulse = 1 + Math.sin(t * 1.6 + i * 0.7) * 0.06 + (isSel ? 0.35 : isNeighbor ? 0.15 : 0);
      const bobY = Math.sin(t * 0.7 + i * 1.3) * 0.22;
      let { x, y, z } = n;
      if (selectedId && isNeighbor) {
        const s = nodes[indexById.get(selectedId)!];
        if (s) {
          x += (s.x - x) * 0.12;
          y += (s.y - y) * 0.12;
          z += (s.z - z) * 0.12;
        }
      }
      tmpObj.position.set(x, y + bobY, z);
      tmpObj.rotation.set(t * 0.12 + i, t * 0.1 + i * 0.6, 0);
      tmpObj.scale.setScalar(Math.max(0.001, base * pulse));
      tmpObj.updateMatrix();
      mesh.setMatrixAt(i, tmpObj.matrix);
      tmpColor.set(n.color).multiplyScalar(isSel ? 2.4 : isNeighbor ? 1.6 : 0.95 * dim + 0.05);
      mesh.setColorAt(i, tmpColor);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    const halo = haloRef.current;
    if (halo) {
      nodes.forEach((n, i) => {
        const isSel = n.id === selectedId;
        const isNeighbor = selectedId ? neighbors.get(selectedId)?.has(n.id) : false;
        const base = 0.55 + Math.min(n.pairingCount ?? 0, 12) * 0.055;
        halo.getMatrixAt(i, tmpObj.matrix);
        tmpObj.matrix.decompose(tmpObj.position, tmpObj.quaternion, tmpObj.scale);
        tmpObj.scale.setScalar(base * (isSel ? 2.1 : isNeighbor ? 1.7 : 1.35));
        tmpObj.updateMatrix();
        halo.setMatrixAt(i, tmpObj.matrix);
        const dim = dimFactor(n, selectedId, neighbors, searchQuery, activeCategories);
        tmpColor.set(n.color).multiplyScalar((isSel || isNeighbor ? 0.5 : 0.16) * Math.max(dim, 0.08));
        halo.setColorAt(i, tmpColor);
      });
      halo.instanceMatrix.needsUpdate = true;
      if (halo.instanceColor) halo.instanceColor.needsUpdate = true;
    }

    if (spinGroup.current && !selectedId) {
      spinGroup.current.rotation.y += 0.0009;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    const node = nodes[e.instanceId];
    if (node) onSelect(node.id === selectedId ? null : node.id);
  };

  return (
    <group>
      <instancedMesh ref={haloRef} args={[undefined, undefined, Math.max(nodes.length, 1)]} key={`halo-${nodes.length}`}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, Math.max(nodes.length, 1)]}
        key={`core-${nodes.length}`}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function EdgeField({
  nodes,
  pairings,
  selectedId,
}: Pick<GalaxyProps, "nodes" | "pairings" | "selectedId">) {
  const solidRef = useRef<THREE.LineSegments>(null!);
  const dashRef = useRef<THREE.LineSegments>(null!);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const { solid, dashed } = useMemo(() => {
    const solidPos: number[] = [];
    const solidCol: number[] = [];
    const dashPos: number[] = [];
    const dashCol: number[] = [];
    const c = new THREE.Color();
    for (const p of pairings) {
      const a = byId.get(p.ingredientA);
      const b = byId.get(p.ingredientB);
      if (!a || !b) continue;
      const focused = !selectedId || p.ingredientA === selectedId || p.ingredientB === selectedId;
      if (p.strength === "classic") c.set("#ffe9c4");
      else if (p.strength === "strong") c.set("#9db4d8").lerp(new THREE.Color(a.color), 0.35);
      else c.set(a.color).multiplyScalar(0.7);
      const brightness = focused ? 1 : 0.15;
      const target = p.strength === "experimental" ? { pos: dashPos, col: dashCol } : { pos: solidPos, col: solidCol };
      target.pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      target.col.push(c.r * brightness, c.g * brightness, c.b * brightness, c.r * brightness, c.g * brightness, c.b * brightness);
    }
    const mk = (pos: number[], col: number[]) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      return g;
    };
    return { solid: mk(solidPos, solidCol), dashed: mk(dashPos, dashCol) };
  }, [nodes, pairings, byId, selectedId]);

  useLayoutEffect(() => {
    dashRef.current?.computeLineDistances();
  }, [dashed]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (solidRef.current) {
      (solidRef.current.material as THREE.LineBasicMaterial).opacity = 0.55 + Math.sin(t * 1.4) * 0.2;
    }
    if (dashRef.current) {
      (dashRef.current.material as THREE.LineDashedMaterial).opacity = 0.3 + Math.sin(t * 1.1 + 2) * 0.12;
    }
  });

  return (
    <group>
      <lineSegments ref={solidRef} geometry={solid}>
        <lineBasicMaterial vertexColors transparent opacity={0.65} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </lineSegments>
      <lineSegments ref={dashRef} geometry={dashed}>
        <lineDashedMaterial vertexColors transparent opacity={0.35} dashSize={0.6} gapSize={0.45} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </lineSegments>
    </group>
  );
}

function CameraRig({
  nodes,
  selectedId,
  controlsRef,
}: {
  nodes: PositionedNode[];
  selectedId: string | null;
  controlsRef: React.RefObject<OrbitControlsImpl>;
}) {
  const anim = useRef<{ t: number; fromP: THREE.Vector3; toP: THREE.Vector3; fromT: THREE.Vector3; toT: THREE.Vector3 } | null>(null);
  const lastSel = useRef<string | null>(null);

  useFrame(({ camera, clock }) => {
    const controls = controlsRef.current;
    if (selectedId !== lastSel.current) {
      lastSel.current = selectedId;
      const fromP = camera.position.clone();
      const fromT = controls ? controls.target.clone() : new THREE.Vector3(0, 0, 0);
      let toP: THREE.Vector3;
      let toT: THREE.Vector3;
      if (selectedId) {
        const n = nodes.find((x) => x.id === selectedId);
        const focus = n ? new THREE.Vector3(n.x, n.y, n.z) : new THREE.Vector3(0, 0, 0);
        const dir = focus.clone().sub(new THREE.Vector3(0, 0, 0));
        if (dir.length() < 0.01) dir.set(1, 0.5, 1);
        dir.normalize();
        toT = focus;
        toP = focus.clone().add(dir.multiplyScalar(13)).add(new THREE.Vector3(0, 3.2, 0));
      } else {
        toT = new THREE.Vector3(0, 0, 0);
        toP = new THREE.Vector3(0, 9, 34);
      }
      anim.current = { t: 0, fromP, toP, fromT, toT };
    }
    const a = anim.current;
    if (a) {
      a.t += clock.getDelta() / 1.6;
      const k = easeInOutCubic(Math.min(a.t, 1));
      camera.position.lerpVectors(a.fromP, a.toP, k);
      if (controls) {
        controls.target.lerpVectors(a.fromT, a.toT, k);
        controls.update();
      }
      if (a.t >= 1) anim.current = null;
    } else if (!selectedId) {
      const angle = clock.getElapsedTime() * 0.03;
      const r = 34;
      camera.position.x += (Math.sin(angle) * r - camera.position.x) * 0.002;
      camera.position.z += (Math.cos(angle) * r - camera.position.z) * 0.002;
    }
  });
  return null;
}

export default function FlavorGalaxy(props: GalaxyProps) {
  const spinGroup = useRef<THREE.Group>(null!);
  const controlsRef = useRef<OrbitControlsImpl>(null!);

  return (
    <>
      <color attach="background" args={["#05060a"]} />
      <fogExp2 attach="fog" args={["#05060a", 0.02]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[18, 12, 10]} intensity={60} color="#ffb347" />
      <pointLight position={[-16, -8, -12]} intensity={50} color="#5b8cff" />

      <Stars radius={120} depth={60} count={props.isMobile ? 900 : 2600} factor={3.2} saturation={0} fade speed={0.4} />

      <group ref={spinGroup}>
        <EdgeField nodes={props.nodes} pairings={props.pairings} selectedId={props.selectedId} />
        <NodeField {...props} spinGroup={spinGroup} />
      </group>

      <CameraRig nodes={props.nodes} selectedId={props.selectedId} controlsRef={controlsRef} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={props.selectedId ? 0.25 : 0.6}
        minDistance={6}
        maxDistance={70}
        enablePan={!props.selectedId}
      />

      {!props.isMobile && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.12} luminanceSmoothing={0.2} />
          <Vignette darkness={0.72} offset={0.22} />
        </EffectComposer>
      )}
    </>
  );
}
