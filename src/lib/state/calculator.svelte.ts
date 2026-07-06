export interface CalcTerm {
  id: string;
  label: string;
  value: number;
  sign: 1 | -1;
}

let nextId = 1;

/** Termos da calculadora: cada um soma ou subtrai do total, vindo de uma rolagem ou digitado manualmente. */
export const calculator = $state<{ terms: CalcTerm[] }>({ terms: [] });

export function addTerm(label: string, value: number, sign: 1 | -1 = 1) {
  calculator.terms.push({ id: `term-${nextId++}`, label, value, sign });
}

export function removeTerm(id: string) {
  const idx = calculator.terms.findIndex((t) => t.id === id);
  if (idx !== -1) calculator.terms.splice(idx, 1);
}

export function clearCalculator() {
  calculator.terms.splice(0, calculator.terms.length);
}

export function calculatorTotal(terms: CalcTerm[]): number {
  return terms.reduce((sum, t) => sum + t.sign * t.value, 0);
}
