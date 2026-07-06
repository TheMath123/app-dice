import * as THREE from "three";
import * as CANNON from "cannon-es";
import { createNumberTexture, createPipTexture } from "../textures";
import type { DieBuild } from "./types";

export type { DieBuild };

/** BoxGeometry agrupa materiais na ordem: +x, -x, +y, -y, +z, -z */
export function buildD6(opts: { size?: number; faceValues?: string[] } = {}): DieBuild {
  const { size = 1.6, faceValues } = opts;
  const geometry = new THREE.BoxGeometry(size, size, size);

  const values = faceValues ?? ["2", "5", "1", "6", "3", "4"];
  const isCustom = !!faceValues;
  const faceNormalsOrdered = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
  ];

  const materials = values.map(
    (v) =>
      new THREE.MeshStandardMaterial({
        map: isCustom ? createNumberTexture(v) : createPipTexture(Number(v)),
        roughness: 0.55,
        metalness: 0.05,
      }),
  );

  const faceNormals = new Map<string, THREE.Vector3>();
  values.forEach((v, i) => faceNormals.set(v, faceNormalsOrdered[i]));

  const half = size / 2;
  const shape = new CANNON.Box(new CANNON.Vec3(half, half, half));

  return { geometry, materials, shape, faceNormals, restHeight: half };
}
