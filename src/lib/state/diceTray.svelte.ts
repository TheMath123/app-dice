export interface TrayDie {
  id: string;
  /** nº de lados da geometria usada (ex.: 10 para as duas metades do d100) */
  sides: number;
  /** valores customizados das faces, se diferente de 1..sides (ex.: dezena do d100) */
  values?: string[];
  /** nome do preset de origem, se este dado customizado foi criado a partir de um (senão mostra "custom(N)") */
  label?: string;
  result: string | null;
  /** presente quando este dado é metade de um par (ex.: d100 = dezena + unidade) */
  pairId?: string;
  pairRole?: "tens" | "units";
}

let nextId = 1;

/** Bandeja de dados ativos: cada entrada é um dado (ou metade de um par), com seu último resultado. */
export const tray = $state<{ dice: TrayDie[] }>({ dice: [] });

export function addDie(sides: number) {
  if (sides === 100) {
    const pairId = `pair-${nextId++}`;
    tray.dice.push(
      {
        id: `${pairId}-tens`,
        sides: 10,
        values: ["0", "10", "20", "30", "40", "50", "60", "70", "80", "90"],
        result: null,
        pairId,
        pairRole: "tens",
      },
      {
        id: `${pairId}-units`,
        sides: 10,
        values: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
        result: null,
        pairId,
        pairRole: "units",
      },
    );
    return;
  }
  tray.dice.push({ id: `d${sides}-${nextId++}`, sides, result: null });
}

export function addCustomDie(values: string[], label?: string) {
  tray.dice.push({ id: `custom-${nextId++}`, sides: values.length, values, label, result: null });
}

/**
 * Remove o dado; aceita tanto o id de um dado individual quanto o pairId de
 * um par (d100 = dezena + unidade) — nesse caso remove as duas metades.
 */
export function removeDie(id: string) {
  const byPairId = tray.dice.filter((d) => d.pairId === id);
  const pairId = byPairId.length > 0 ? id : tray.dice.find((d) => d.id === id)?.pairId;

  if (pairId) {
    for (let i = tray.dice.length - 1; i >= 0; i--) {
      if (tray.dice[i].pairId === pairId) tray.dice.splice(i, 1);
    }
    return;
  }

  const idx = tray.dice.findIndex((d) => d.id === id);
  if (idx !== -1) tray.dice.splice(idx, 1);
}

export function clearTray() {
  tray.dice.splice(0, tray.dice.length);
}

/** Valor combinado do d100 a partir das duas metades (convenção: 0+0 = 100). */
export function combinePercentile(tens: string | null, units: string | null): number | null {
  if (tens === null || units === null) return null;
  const total = Number(tens) + Number(units);
  return total === 0 ? 100 : total;
}
