export interface HistoryEntry {
  id: string;
  label: string;
  value: string;
  timestamp: number;
}

const MAX_HISTORY = 50;
let nextId = 1;

/** Histórico das últimas rolagens (mais recente primeiro). */
export const history = $state<{ entries: HistoryEntry[] }>({ entries: [] });

export function pushHistory(label: string, value: string) {
  history.entries.unshift({ id: `hist-${nextId++}`, label, value, timestamp: Date.now() });
  if (history.entries.length > MAX_HISTORY) {
    history.entries.splice(MAX_HISTORY, history.entries.length - MAX_HISTORY);
  }
}

export function clearHistory() {
  history.entries.splice(0, history.entries.length);
}
