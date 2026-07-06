import * as THREE from "three";
import { buildConvexDie } from "./convexDie";
import { createNumberTexture } from "../textures";
import type { DieBuild } from "./types";

/**
 * Bipirâmide de N faces (N par): duas pirâmides de base N/2-gonal unidas
 * pela base. É a forma clássica usada por rolagens 3D para dados "não
 * platônicos" (aqui: d10, e no futuro qualquer dado customizado de N faces
 * pares) — o convex hull encontra as N faces triangulares automaticamente.
 */
export function buildBipyramidDie(
  sides: number,
  opts: { height: number; radius?: number; faceValues?: string[] },
): DieBuild {
  if (sides % 2 !== 0 || sides < 4) {
    throw new Error("buildBipyramidDie: número de faces deve ser par e >= 4");
  }
  const { height, radius = 1, faceValues } = opts;
  const baseSides = sides / 2;

  const points: THREE.Vector3[] = [new THREE.Vector3(0, 0, height), new THREE.Vector3(0, 0, -height)];
  for (let i = 0; i < baseSides; i++) {
    const angle = (2 * Math.PI * i) / baseSides;
    points.push(new THREE.Vector3(radius * Math.cos(angle), radius * Math.sin(angle), 0));
  }

  const values = faceValues ?? Array.from({ length: sides }, (_, i) => String(i + 1));
  return buildConvexDie({ points, faceValues: values, textureFn: (v) => createNumberTexture(v) });
}

/**
 * d10 "percentil": use `faceValues` para representar tanto o dado de
 * dezena (0,10,...,90) quanto o de unidade (0..9) do d100 tradicional de
 * RPG — ou omita para um d10 comum (1..10). Proporção mais achatada que
 * um bipiramide "padrão" para deixar cada face triangular menos alongada
 * e o número mais legível.
 */
export function buildD10(faceValues?: string[]): DieBuild {
  return buildBipyramidDie(10, { height: 0.62, radius: 1.05, faceValues });
}
