import * as THREE from "three";
import { buildConvexDie } from "./convexDie";
import { createNumberTexture } from "../textures";
import type { DieBuild } from "./types";

const PHI = (1 + Math.sqrt(5)) / 2;

function scaled(points: THREE.Vector3[], radius: number): THREE.Vector3[] {
  const maxLen = Math.max(...points.map((p) => p.length()));
  const factor = radius / maxLen;
  return points.map((p) => p.clone().multiplyScalar(factor));
}

function sequentialValues(count: number): string[] {
  return Array.from({ length: count }, (_, i) => String(i + 1));
}

export function buildD4(opts: { radius?: number; faceValues?: string[] } = {}): DieBuild {
  const { radius = 1.15, faceValues } = opts;
  const points = scaled(
    [
      new THREE.Vector3(1, 1, 1),
      new THREE.Vector3(1, -1, -1),
      new THREE.Vector3(-1, 1, -1),
      new THREE.Vector3(-1, -1, 1),
    ],
    radius,
  );
  return buildConvexDie({ points, faceValues: faceValues ?? sequentialValues(4), textureFn: (v) => createNumberTexture(v) });
}

export function buildD8(opts: { radius?: number; faceValues?: string[] } = {}): DieBuild {
  const { radius = 1.25, faceValues } = opts;
  const points = scaled(
    [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
    ],
    radius,
  );
  return buildConvexDie({ points, faceValues: faceValues ?? sequentialValues(8), textureFn: (v) => createNumberTexture(v) });
}

export function buildD12(opts: { radius?: number; faceValues?: string[] } = {}): DieBuild {
  const { radius = 1.35, faceValues } = opts;
  const points: THREE.Vector3[] = [];
  for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) points.push(new THREE.Vector3(sx, sy, sz));
  for (const sy of [1, -1]) for (const sz of [1, -1]) points.push(new THREE.Vector3(0, sy / PHI, sz * PHI));
  for (const sx of [1, -1]) for (const sy of [1, -1]) points.push(new THREE.Vector3(sx / PHI, sy * PHI, 0));
  for (const sx of [1, -1]) for (const sz of [1, -1]) points.push(new THREE.Vector3(sx * PHI, 0, sz / PHI));

  return buildConvexDie({
    points: scaled(points, radius),
    faceValues: faceValues ?? sequentialValues(12),
    textureFn: (v) => createNumberTexture(v),
  });
}

export function buildD20(opts: { radius?: number; faceValues?: string[] } = {}): DieBuild {
  const { radius = 1.3, faceValues } = opts;
  const points: THREE.Vector3[] = [];
  for (const sy of [1, -1]) for (const sz of [1, -1]) points.push(new THREE.Vector3(0, sy, sz * PHI));
  for (const sx of [1, -1]) for (const sy of [1, -1]) points.push(new THREE.Vector3(sx, sy * PHI, 0));
  for (const sx of [1, -1]) for (const sz of [1, -1]) points.push(new THREE.Vector3(sx * PHI, 0, sz));

  return buildConvexDie({
    points: scaled(points, radius),
    faceValues: faceValues ?? sequentialValues(20),
    textureFn: (v) => createNumberTexture(v),
  });
}
