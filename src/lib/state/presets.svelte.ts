import { loadCustomDicePresets, saveCustomDicePresets, type CustomDiePreset } from "$lib/api/presets";

export const presetsState = $state<{ items: CustomDiePreset[] }>({ items: [] });

export async function initPresets() {
  presetsState.items = await loadCustomDicePresets();
}

export async function addPreset(label: string, values: string[]) {
  presetsState.items.push({ id: `preset-${Date.now()}`, label, values });
  await saveCustomDicePresets(presetsState.items);
}

export async function removePreset(id: string) {
  const idx = presetsState.items.findIndex((p) => p.id === id);
  if (idx !== -1) presetsState.items.splice(idx, 1);
  await saveCustomDicePresets(presetsState.items);
}
