<script lang="ts">
  import { onMount } from "svelte";
  import type { Snippet } from "svelte";

  let { title, onClose, children }: { title: string; onClose: () => void; children: Snippet } = $props();

  let panelEl: HTMLDivElement | undefined = $state();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    }
  }

  onMount(() => {
    panelEl?.querySelector<HTMLElement>("input, select, button")?.focus();
  });
</script>

<div class="panel" role="dialog" aria-modal="true" aria-label={title} bind:this={panelEl} onkeydown={handleKeydown} tabindex="-1">
  <div class="panel-header">
    <h2>{title}</h2>
    <button class="close-btn" onclick={onClose} aria-label="Fechar painel">×</button>
  </div>
  <div class="panel-body">
    {@render children()}
  </div>
</div>

<style>
  .panel {
    position: absolute;
    top: 1rem;
    right: 1.4rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1.1rem;
    width: 320px;
    max-height: calc(100% - 2rem);
    overflow-y: auto;
    box-shadow: var(--shadow-md);
    z-index: 10;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 650;
  }

  .close-btn {
    border: none;
    background: transparent;
    font-size: 1.15rem;
    line-height: 1;
    color: var(--color-text-faint);
    padding: 0.2rem 0.45rem;
    border-radius: var(--radius-pill);
  }

  .close-btn:hover {
    background: var(--color-surface-muted);
    color: var(--color-text);
  }
</style>
