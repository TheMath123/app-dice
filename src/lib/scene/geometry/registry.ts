import { buildD6 } from "./platonic";
import { buildD4, buildD8, buildD12, buildD20 } from "./solids";
import { buildD10 } from "./bipyramid";
import type { DieBuild } from "./types";

/** d100 não tem geometria própria: é representado como par de d10 (dezena + unidade), ver diceTray.svelte.ts */
export const STANDARD_DICE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const;
export type StandardSides = (typeof STANDARD_DICE_SIDES)[number];

export function buildStandardDie(sides: number): DieBuild {
  switch (sides) {
    case 4:
      return buildD4();
    case 6:
      return buildD6();
    case 8:
      return buildD8();
    case 10:
      return buildD10();
    case 12:
      return buildD12();
    case 20:
      return buildD20();
    default:
      throw new Error(`Sem geometria padrão para d${sides}`);
  }
}
