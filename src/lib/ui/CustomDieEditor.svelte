<script lang="ts">
  import { isSupportedCustomFaceCount } from "$lib/scene/geometry/customDie";
  import { presetsState, addPreset, removePreset } from "$lib/state/presets.svelte";
  import Panel from "./Panel.svelte";

  let { onCreate, onClose }: { onCreate: (values: string[], label?: string) => void; onClose: () => void } = $props();

  let text = $state("1,2,3,4,5,6");
  let presetLabel = $state("");
  let error = $state<string | null>(null);

  function parseValues(): string[] | null {
    if (text.includes(";")) {
      error = 'Ponto e vírgula (";") não é permitido nos valores.';
      return null;
    }
    const values = text
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (values.length === 0) {
      error = "Informe ao menos um valor.";
      return null;
    }
    if (new Set(values).size !== values.length) {
      error = "Os valores devem ser distintos.";
      return null;
    }
    if (!isSupportedCustomFaceCount(values.length)) {
      error = `Número de faces não suportado (${values.length}). Use 4, 6, 8, 10, 12, 20 ou qualquer número par ≥ 4.`;
      return null;
    }
    return values;
  }

  function handleCreate() {
    error = null;
    const values = parseValues();
    if (!values) return;
    onCreate(values);
  }

  async function handleSavePreset() {
    error = null;
    const values = parseValues();
    if (!values) return;
    const label = presetLabel.trim() || values.join(",");
    await addPreset(label, values);
    presetLabel = "";
  }

  function usePreset(values: string[], label: string) {
    onCreate(values, label);
  }
</script>

<Panel title="Dado customizado" {onClose}>
  <label class="field" for="custom-values-input">
    Valores das faces
    <input id="custom-values-input" type="text" bind:value={text} placeholder="ex.: Sim,Não,Talvez ou 1,3,5,7,9,11" />
  </label>
  <p class="hint">Separe por vírgula — letras, números ou símbolos, exceto vírgula e ponto-e-vírgula. Devem ser distintos.</p>

  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}

  <div class="actions">
    <button onclick={onClose}>Cancelar</button>
    <button class="primary" onclick={handleCreate}>Adicionar à bandeja</button>
  </div>

  <div class="save-row">
    <label class="field" for="preset-name-input">
      <span class="sr-only">Nome do preset</span>
      <input id="preset-name-input" type="text" bind:value={presetLabel} placeholder="nome do preset (opcional)" />
    </label>
    <button onclick={handleSavePreset}>Salvar</button>
  </div>

  {#if presetsState.items.length > 0}
    <div class="presets">
      <p class="hint">Presets salvos</p>
      {#each presetsState.items as preset (preset.id)}
        <div class="preset-row">
          <button class="preset-btn" onclick={() => usePreset(preset.values, preset.label)}>{preset.label}</button>
          <button class="preset-remove" onclick={() => removePreset(preset.id)} aria-label={`Remover preset ${preset.label}`}>×</button>
        </div>
      {/each}
    </div>
  {/if}
</Panel>

<style>
  .field {
    display: block;
    font-size: 0.78rem;
    color: var(--color-text-muted);
    margin-bottom: 0.6rem;
  }

  input {
    display: block;
    width: 100%;
    margin-top: 0.3rem;
    padding: 0.5rem 0.6rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border-strong);
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.9rem;
  }

  .hint {
    margin: 0 0 0.5rem;
    font-size: 0.78rem;
    color: var(--color-text-muted);
    line-height: 1.35;
  }

  .error {
    color: var(--color-danger);
    font-size: 0.8rem;
    margin: 0.5rem 0 0;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.8rem;
  }

  .save-row {
    display: flex;
    align-items: flex-end;
    gap: 0.4rem;
    margin-top: 0.9rem;
    padding-top: 0.9rem;
    border-top: 1px solid var(--color-border);
  }

  .save-row .field {
    flex: 1;
    margin-bottom: 0;
  }

  button {
    border: none;
    border-radius: var(--radius-sm);
    padding: 0.45rem 0.85rem;
    font-weight: 600;
    font-size: 0.85rem;
    white-space: nowrap;
    background: var(--color-surface-muted);
    color: var(--color-text);
    transition: opacity 0.15s;
  }

  button:hover {
    opacity: 0.85;
  }

  button.primary {
    background: var(--color-accent);
    color: var(--color-accent-contrast);
  }

  .presets {
    margin-top: 0.9rem;
    padding-top: 0.7rem;
    border-top: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .preset-row {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .preset-btn {
    flex: 1;
    text-align: left;
    background: var(--color-bg);
  }

  .preset-remove {
    background: transparent;
    color: var(--color-text-faint);
    padding: 0.2rem 0.5rem;
  }

  .preset-remove:hover {
    background: var(--color-surface-muted);
    color: var(--color-text);
  }
</style>
