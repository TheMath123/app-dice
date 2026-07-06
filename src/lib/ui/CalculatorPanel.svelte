<script lang="ts">
  import { calculator, addTerm, removeTerm, clearCalculator, calculatorTotal } from "$lib/state/calculator.svelte";
  import { history, clearHistory } from "$lib/state/history.svelte";
  import Panel from "./Panel.svelte";

  let { diceValues, onClose }: { diceValues: { label: string; value: number }[]; onClose: () => void } = $props();

  let manualValue = $state("");
  let manualSign = $state<1 | -1>(1);

  let diceSum = $derived(diceValues.reduce((sum, d) => sum + d.value, 0));
  let manualTotal = $derived(calculatorTotal(calculator.terms));
  let total = $derived(diceSum + manualTotal);

  function handleAddManual() {
    const n = Number(manualValue);
    if (!Number.isFinite(n)) return;
    addTerm("manual", n, manualSign);
    manualValue = "";
  }

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
</script>

<Panel title="Calculadora" {onClose}>
  <div class="total-row">
    <span>Total</span>
    <strong aria-live="polite">{total}</strong>
  </div>

  {#if diceValues.length > 0}
    <div class="terms">
      <p class="hint">Dados na bandeja (soma automática)</p>
      {#each diceValues as dv, i (i)}
        <div class="term-row">
          <span class="term-label">{dv.label}: {dv.value}</span>
        </div>
      {/each}
    </div>
  {/if}

  {#if calculator.terms.length > 0}
    <div class="terms">
      <p class="hint">Ajustes manuais</p>
      {#each calculator.terms as term (term.id)}
        <div class="term-row">
          <span class="term-label">{term.sign > 0 ? "+" : "−"} {term.label}: {term.value}</span>
          <button class="term-remove" onclick={() => removeTerm(term.id)} aria-label={`Remover ajuste ${term.label}`}>×</button>
        </div>
      {/each}
    </div>
    <button class="clear-btn" onclick={clearCalculator}>Limpar ajustes manuais</button>
  {/if}

  <div class="manual-row">
    <label class="sr-only" for="calc-sign">Sinal</label>
    <select id="calc-sign" bind:value={manualSign}>
      <option value={1}>+</option>
      <option value={-1}>−</option>
    </select>
    <label class="sr-only" for="calc-manual-value">Número para somar</label>
    <input
      id="calc-manual-value"
      type="number"
      bind:value={manualValue}
      placeholder="número"
      onkeydown={(e) => e.key === "Enter" && handleAddManual()}
    />
    <button onclick={handleAddManual}>Somar</button>
  </div>

  <div class="history-section">
    <div class="history-header">
      <p class="hint">Histórico</p>
      {#if history.entries.length > 0}
        <button class="clear-btn" onclick={clearHistory}>Limpar</button>
      {/if}
    </div>
    {#if history.entries.length === 0}
      <p class="hint">Nenhuma rolagem ainda.</p>
    {:else}
      <div class="history-list">
        {#each history.entries as entry (entry.id)}
          <div class="history-row">
            <span class="history-label">{entry.label}</span>
            <span class="history-value">{entry.value}</span>
            <span class="history-time">{formatTime(entry.timestamp)}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</Panel>

<style>
  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin: 0.4rem 0 0.7rem;
    font-size: 1rem;
  }

  .total-row strong {
    font-size: 1.6rem;
  }

  .hint {
    margin: 0.3rem 0;
    font-size: 0.78rem;
    color: var(--color-text-muted);
  }

  .terms {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    margin: 0.5rem 0;
  }

  .term-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--color-surface-muted);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.5rem;
    font-size: 0.85rem;
  }

  .term-remove {
    border: none;
    background: transparent;
    color: var(--color-text-faint);
    padding: 0.1rem 0.4rem;
    border-radius: var(--radius-pill);
  }

  .term-remove:hover {
    background: var(--color-bg);
    color: var(--color-text);
  }

  .manual-row {
    display: flex;
    gap: 0.4rem;
    margin-top: 0.6rem;
  }

  .manual-row input {
    flex: 1;
    min-width: 0;
    padding: 0.4rem 0.5rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border-strong);
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.85rem;
  }

  select {
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border-strong);
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.85rem;
  }

  button {
    border: none;
    border-radius: var(--radius-sm);
    padding: 0.4rem 0.7rem;
    font-weight: 600;
    font-size: 0.8rem;
    background: var(--color-accent);
    color: var(--color-accent-contrast);
    white-space: nowrap;
    transition: opacity 0.15s;
  }

  button:hover {
    opacity: 0.85;
  }

  .clear-btn {
    background: var(--color-surface-muted);
    color: var(--color-text);
    margin-top: 0.5rem;
  }

  .history-section {
    margin-top: 1rem;
    padding-top: 0.8rem;
    border-top: 1px solid var(--color-border);
  }

  .history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    max-height: 180px;
    overflow-y: auto;
  }

  .history-row {
    display: flex;
    gap: 0.4rem;
    font-size: 0.78rem;
    color: var(--color-text-muted);
  }

  .history-label {
    font-weight: 600;
    min-width: 3.5rem;
  }

  .history-value {
    flex: 1;
  }

  .history-time {
    color: var(--color-text-faint);
  }
</style>
