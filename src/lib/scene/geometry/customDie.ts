import { buildD6 } from "./platonic";
import { buildD4, buildD8, buildD12, buildD20 } from "./solids";
import { buildBipyramidDie } from "./bipyramid";
import type { DieBuild } from "./types";

/** Contagens de face com geometria "própria" (sólido platônico); qualquer outro par usa bipirâmide genérica. */
const PLATONIC_COUNTS = new Set([4, 6, 8, 12, 20]);

export function isSupportedCustomFaceCount(count: number): boolean {
  return PLATONIC_COUNTS.has(count) || (count >= 4 && count % 2 === 0);
}

/**
 * Constrói um dado com valores de face arbitrários e distintos. Reaproveita
 * a geometria platônica quando a contagem de faces bate com um sólido
 * conhecido (4/6/8/12/20); caso contrário usa a bipirâmide genérica (mesma
 * usada pelo d10/d100), que funciona para qualquer N par >= 4.
 */
export function buildCustomDie(values: string[]): DieBuild {
  const unique = new Set(values);
  if (unique.size !== values.length) {
    throw new Error("Os valores de um dado customizado devem ser distintos.");
  }

  const n = values.length;
  switch (n) {
    case 4:
      return buildD4({ faceValues: values });
    case 6:
      return buildD6({ faceValues: values });
    case 8:
      return buildD8({ faceValues: values });
    case 12:
      return buildD12({ faceValues: values });
    case 20:
      return buildD20({ faceValues: values });
    default:
      if (!isSupportedCustomFaceCount(n)) {
        throw new Error(`Número de faces não suportado: ${n}. Use 4, 6, 8, 10, 12, 20 ou qualquer número par ≥ 4.`);
      }
      return buildBipyramidDie(n, { height: n <= 14 ? 0.62 : 0.4, radius: n <= 14 ? 1.05 : 0.95, faceValues: values });
  }
}
