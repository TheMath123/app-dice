import { invoke } from "@tauri-apps/api/core";

export type DieSpec = { kind: "standard"; sides: number } | { kind: "custom"; values: string[] };

export type RollRequest = { id: string } & DieSpec;

export interface RollResult {
  id: string;
  value: string;
  faceIndex: number;
}

/** Único ponto de entrada para sorteios: sempre passa pelo CSPRNG do backend Rust. */
export function rollMany(requests: RollRequest[]): Promise<RollResult[]> {
  return invoke("roll_many", { requests });
}
