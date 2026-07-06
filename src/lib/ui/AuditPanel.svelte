<script lang="ts">
  import { simulateAudit, type AuditReport } from "$lib/api/audit";
  import Panel from "./Panel.svelte";

  let { onClose }: { onClose: () => void } = $props();

  const DIE_OPTIONS = [4, 6, 8, 10, 12, 20, 100];
  const ROLL_OPTIONS = [10_000, 100_000, 1_000_000];

  let sides = $state(20);
  let rolls = $state(100_000);
  let running = $state(false);
  let error = $state<string | null>(null);
  let report = $state<AuditReport | null>(null);

  async function run() {
    running = true;
    error = null;
    report = null;
    try {
      report = await simulateAudit(sides, rolls);
    } catch (err) {
      error = String(err);
    } finally {
      running = false;
    }
  }

  let maxCount = $derived(report ? Math.max(...report.histogram) : 0);
  let expected = $derived(report ? report.rolls / report.sides : 0);
  let expectedPct = $derived(maxCount > 0 ? (expected / maxCount) * 100 : 0);
</script>

<Panel title="Auditoria estatística" {onClose}>
  <p class="hint">
    Roda uma rolagem em massa usando o mesmo CSPRNG do backend e aplica um teste qui-quadrado de aderência à distribuição uniforme —
    prova numérica de que nenhuma face é favorecida.
  </p>

  <div class="controls-row">
    <label for="audit-sides">
      Dado
      <select id="audit-sides" bind:value={sides}>
        {#each DIE_OPTIONS as s (s)}
          <option value={s}>d{s}</option>
        {/each}
      </select>
    </label>
    <label for="audit-rolls">
      Rolagens
      <select id="audit-rolls" bind:value={rolls}>
        {#each ROLL_OPTIONS as r (r)}
          <option value={r}>{r.toLocaleString("pt-BR")}</option>
        {/each}
      </select>
    </label>
  </div>

  <button class="run-btn" onclick={run} disabled={running}>{running ? "Rodando..." : "Rodar auditoria"}</button>

  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}

  {#if report}
    <div class="result">
      <div class="badge" class:pass={report.passed} class:fail={!report.passed} role="status">
        {report.passed ? "PASSOU" : "FALHOU"}
      </div>
      <div class="stats">
        <span>p-valor: <strong>{report.pValue.toFixed(4)}</strong></span>
        <span>χ²: <strong>{report.chiSquare.toFixed(2)}</strong></span>
        <span>gl: <strong>{report.degreesOfFreedom}</strong></span>
      </div>

      <div class="histogram" role="img" aria-label="Histograma de frequência por face">
        <div class="expected-line" style={`bottom: ${expectedPct}%`} title={`esperado: ${expected.toFixed(1)}`}></div>
        {#each report.histogram as count, i (i)}
          <div class="bar-col">
            <div class="bar" style={`height: ${maxCount > 0 ? (count / maxCount) * 100 : 0}%`} title={`face ${i + 1}: ${count}`}></div>
          </div>
        {/each}
      </div>
      <p class="hint small">Barras = frequência observada por face; linha tracejada = frequência esperada sob distribuição uniforme.</p>
    </div>
  {/if}
</Panel>

<style>
  .hint {
    margin: 0.4rem 0;
    font-size: 0.78rem;
    color: var(--color-text-muted);
    line-height: 1.35;
  }

  .hint.small {
    font-size: 0.72rem;
  }

  .controls-row {
    display: flex;
    gap: 0.6rem;
    margin: 0.6rem 0;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.75rem;
    color: var(--color-text-muted);
    flex: 1;
  }

  select {
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border-strong);
    background: var(--color-bg);
    color: var(--color-text);
    padding: 0.35rem 0.4rem;
    font-size: 0.85rem;
  }

  .run-btn {
    width: 100%;
    border: none;
    border-radius: var(--radius-sm);
    padding: 0.55rem 0.8rem;
    font-weight: 600;
    font-size: 0.85rem;
    background: var(--color-accent);
    color: var(--color-accent-contrast);
    transition: opacity 0.15s;
  }

  .run-btn:hover:not(:disabled) {
    opacity: 0.85;
  }

  .run-btn:disabled {
    opacity: 0.5;
  }

  .error {
    color: var(--color-danger);
    font-size: 0.8rem;
  }

  .result {
    margin-top: 0.9rem;
    padding-top: 0.8rem;
    border-top: 1px solid var(--color-border);
  }

  .badge {
    display: inline-block;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    padding: 0.25rem 0.6rem;
    border-radius: var(--radius-pill);
  }

  .badge.pass {
    background: var(--color-success-bg);
    color: var(--color-success);
  }

  .badge.fail {
    background: var(--color-danger-bg);
    color: var(--color-danger);
  }

  .stats {
    display: flex;
    gap: 0.8rem;
    margin: 0.6rem 0;
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .histogram {
    position: relative;
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 110px;
    padding: 0 2px;
    border-bottom: 1px solid var(--color-border-strong);
  }

  .bar-col {
    flex: 1;
    display: flex;
    align-items: flex-end;
    height: 100%;
    min-width: 2px;
  }

  .bar {
    width: 100%;
    background: var(--color-accent);
    border-radius: 2px 2px 0 0;
    min-height: 1px;
  }

  .expected-line {
    position: absolute;
    left: 0;
    right: 0;
    border-top: 1px dashed var(--color-text-faint);
  }
</style>
