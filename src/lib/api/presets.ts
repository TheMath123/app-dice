import { Store } from "@tauri-apps/plugin-store";

export interface CustomDiePreset {
  id: string;
  label: string;
  values: string[];
}

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  if (!storePromise) storePromise = Store.load("presets.json");
  return storePromise;
}

export async function loadCustomDicePresets(): Promise<CustomDiePreset[]> {
  const store = await getStore();
  return (await store.get<CustomDiePreset[]>("customDice")) ?? [];
}

export async function saveCustomDicePresets(presets: CustomDiePreset[]): Promise<void> {
  const store = await getStore();
  await store.set("customDice", presets);
  await store.save();
}
