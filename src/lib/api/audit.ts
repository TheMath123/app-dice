import { invoke } from "@tauri-apps/api/core";

export interface AuditReport {
  sides: number;
  rolls: number;
  histogram: number[];
  chiSquare: number;
  degreesOfFreedom: number;
  pValue: number;
  passed: boolean;
}

/** Roda uma rolagem em massa de um dado padrão e aplica o teste qui-quadrado de uniformidade. */
export function simulateAudit(sides: number, rolls: number): Promise<AuditReport> {
  return invoke("simulate_audit", { sides, rolls });
}
