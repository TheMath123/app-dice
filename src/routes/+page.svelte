<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import * as THREE from "three";
  import { DiceScene } from "$lib/scene/DiceScene";
  import { DiceBody } from "$lib/scene/DiceBody";
  import { buildStandardDie, STANDARD_DICE_SIDES } from "$lib/scene/geometry/registry";
  import { buildD10 } from "$lib/scene/geometry/bipyramid";
  import { buildCustomDie } from "$lib/scene/geometry/customDie";
  import { rollMany, type RollRequest } from "$lib/api/rolls";
  import { tray, addDie, addCustomDie, removeDie, combinePercentile, type TrayDie } from "$lib/state/diceTray.svelte";
  import { initPresets } from "$lib/state/presets.svelte";
  import { history, pushHistory } from "$lib/state/history.svelte";
  import CustomDieEditor from "$lib/ui/CustomDieEditor.svelte";
  import CalculatorPanel from "$lib/ui/CalculatorPanel.svelte";
  import AuditPanel from "$lib/ui/AuditPanel.svelte";

  const SLOT_SPACING = 3.0;
  const GRID_COLS = 4;
  const PAIR_OFFSET = 1.7;

  let container: HTMLDivElement;
  let scene: DiceScene;
  const bodies = new Map<string, DiceBody>();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let rollingAll = $state(false);
  let errorMessage = $state<string | null>(null);
  let showCustomEditor = $state(false);
  let showCalculator = $state(false);
  let showAudit = $state(false);

  function togglePanel(panel: "custom" | "calculator" | "audit") {
    showCustomEditor = panel === "custom" ? !showCustomEditor : false;
    showCalculator = panel === "calculator" ? !showCalculator : false;
    showAudit = panel === "audit" ? !showAudit : false;
  }

  interface SlotGroup {
    ids: string[];
  }

  function buildSlotGroups(): SlotGroup[] {
    const groups: SlotGroup[] = [];
    const seenPairs = new Set<string>();
    for (const die of tray.dice) {
      if (die.pairId) {
        if (seenPairs.has(die.pairId)) continue;
        seenPairs.add(die.pairId);
        groups.push({ ids: tray.dice.filter((d) => d.pairId === die.pairId).map((d) => d.id) });
      } else {
        groups.push({ ids: [die.id] });
      }
    }
    return groups;
  }

  function gridSlotPosition(index: number, total: number): THREE.Vector3 {
    const cols = Math.min(GRID_COLS, total);
    const rows = Math.ceil(total / GRID_COLS);
    const row = Math.floor(index / GRID_COLS);
    const rowStart = row * GRID_COLS;
    const rowCount = Math.min(GRID_COLS, total - rowStart);
    const col = index - rowStart;
    const x = (col - (rowCount - 1) / 2) * SLOT_SPACING;
    const z = (row - (rows - 1) / 2) * SLOT_SPACING;
    return new THREE.Vector3(x, 0, z);
  }

  function buildRequest(die: TrayDie): RollRequest {
    return die.values ? { id: die.id, kind: "custom", values: die.values } : { id: die.id, kind: "standard", sides: die.sides };
  }

  function dropAbove(id: string): THREE.Vector3 {
    const body = bodies.get(id);
    const x = body?.mesh.position.x ?? 0;
    const z = body?.mesh.position.z ?? 0;
    return new THREE.Vector3(x, 6, z);
  }

  /**
   * Garante que exista um DiceBody para este dado, criando-o na hora se
   * preciso. Usado tanto pelo efeito reativo quanto na hora de rolar, para
   * que um clique em "Rolar tudo" logo após adicionar um dado nunca role
   * "no vazio" esperando o efeito rodar primeiro.
   */
  function ensureBody(die: TrayDie): DiceBody {
    let body = bodies.get(die.id);
    if (!body) {
      const build = die.pairId ? buildD10(die.values!) : die.values ? buildCustomDie(die.values) : buildStandardDie(die.sides);
      body = new DiceBody(scene, build, new THREE.Vector3(0, build.restHeight, 0));
      bodies.set(die.id, body);
    }
    return body;
  }

  $effect(() => {
    const ids = new Set(tray.dice.map((d) => d.id));
    for (const [id, body] of bodies) {
      if (!ids.has(id)) {
        body.dispose();
        bodies.delete(id);
      }
    }

    for (const die of tray.dice) ensureBody(die);

    const groups = buildSlotGroups();
    groups.forEach((group, gi) => {
      const base = gridSlotPosition(gi, groups.length);
      group.ids.forEach((id, sub) => {
        const body = bodies.get(id);
        if (!body) return;
        const offset = group.ids.length > 1 ? (sub - (group.ids.length - 1) / 2) * PAIR_OFFSET : 0;
        body.placeAt(new THREE.Vector3(base.x + offset, body.restHeight, base.z));
      });
    });

    const cols = Math.min(GRID_COLS, groups.length);
    const rows = Math.ceil(groups.length / GRID_COLS);
    scene?.setViewExtent((Math.max(cols, rows) * SLOT_SPACING) / 2);
  });

  function onPointerDown(event: PointerEvent) {
    const rect = container.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, scene.camera);

    for (const [id, body] of bodies) {
      if (raycaster.intersectObject(body.mesh, false).length > 0) {
        rollOne(id);
        break;
      }
    }
  }

  onMount(() => {
    scene = new DiceScene(container);
    addDie(6);
    container.addEventListener("pointerdown", onPointerDown);
    initPresets();
  });

  onDestroy(() => {
    container?.removeEventListener("pointerdown", onPointerDown);
    for (const body of bodies.values()) body.dispose();
    scene?.dispose();
  });

  function dieLabel(die: TrayDie): string {
    if (die.values) return die.label ?? `custom(${die.sides})`;
    return `d${die.sides}`;
  }

  /** Registra no histórico uma entrada por dado/par lógico (d100 = uma entrada combinada). */
  function recordHistory(diceRolled: TrayDie[]) {
    const seenPairs = new Set<string>();
    for (const die of diceRolled) {
      if (die.pairId) {
        if (seenPairs.has(die.pairId)) continue;
        seenPairs.add(die.pairId);
        const tens = tray.dice.find((d) => d.pairId === die.pairId && d.pairRole === "tens");
        const units = tray.dice.find((d) => d.pairId === die.pairId && d.pairRole === "units");
        const combined = combinePercentile(tens?.result ?? null, units?.result ?? null);
        if (combined !== null) pushHistory("d100", String(combined));
      } else if (die.result !== null) {
        pushHistory(dieLabel(die), die.result);
      }
    }
  }

  async function rollDice(diceToRoll: TrayDie[]) {
    if (diceToRoll.some((d) => bodies.get(d.id)?.isRolling)) return;
    diceToRoll.forEach(ensureBody);
    const requests = diceToRoll.map(buildRequest);
    const results = await rollMany(requests);
    const byId = new Map(results.map((r) => [r.id, r]));
    await Promise.all(
      diceToRoll.map(async (die) => {
        const body = ensureBody(die);
        const result = byId.get(die.id);
        if (!result) return;
        await body.roll(result.value, dropAbove(die.id));
        die.result = result.value;
      }),
    );
    recordHistory(diceToRoll);
  }

  async function rollOne(id: string) {
    const die = tray.dice.find((d) => d.id === id);
    if (!die) return;
    const group = die.pairId ? tray.dice.filter((d) => d.pairId === die.pairId) : [die];
    try {
      await rollDice(group);
    } catch (err) {
      errorMessage = String(err);
    }
  }

  async function rollAll() {
    if (rollingAll || tray.dice.length === 0) return;
    rollingAll = true;
    errorMessage = null;
    try {
      await rollDice(tray.dice);
    } catch (err) {
      errorMessage = String(err);
    } finally {
      rollingAll = false;
    }
  }

  function handleRemove(id: string) {
    removeDie(id);
  }

  let chips = $derived.by(() => {
    const result: { chipId: string; label: string; value: string; numericValue: number | null }[] = [];
    const seenPairs = new Set<string>();
    for (const die of tray.dice) {
      if (die.pairId) {
        if (seenPairs.has(die.pairId)) continue;
        seenPairs.add(die.pairId);
        const tens = tray.dice.find((d) => d.pairId === die.pairId && d.pairRole === "tens");
        const units = tray.dice.find((d) => d.pairId === die.pairId && d.pairRole === "units");
        const combined = combinePercentile(tens?.result ?? null, units?.result ?? null);
        result.push({ chipId: die.pairId, label: "d100", value: combined === null ? "–" : String(combined), numericValue: combined });
      } else {
        const label = dieLabel(die);
        const numeric = die.result === null ? NaN : Number(die.result);
        result.push({
          chipId: die.id,
          label,
          value: die.result === null ? "–" : die.result,
          numericValue: Number.isFinite(numeric) ? numeric : null,
        });
      }
    }
    return result;
  });

  let diceValues = $derived(
    chips
      .filter((c) => c.numericValue !== null)
      .map((c) => ({ label: c.label, value: c.numericValue as number })),
  );

  function handleCreateCustom(values: string[], label?: string) {
    addCustomDie(values, label);
    showCustomEditor = false;
  }

  let lastRollAnnouncement = $derived.by(() => {
    const last = history.entries[0];
    return last ? `${last.label}: ${last.value}` : "";
  });
</script>

<main class="app">
  <header class="topbar">
    <h1>Dice Real</h1>
    <nav class="add-buttons" aria-label="Adicionar dados e abrir painéis">
      {#each STANDARD_DICE_SIDES as sides (sides)}
        <button class="add-btn" onclick={() => addDie(sides)}>+d{sides}</button>
      {/each}
      <button class="add-btn" onclick={() => togglePanel("custom")} aria-pressed={showCustomEditor}>+ Custom</button>
      <span class="divider" aria-hidden="true"></span>
      <button class="add-btn" onclick={() => togglePanel("calculator")} aria-pressed={showCalculator}>Calculadora</button>
      <button class="add-btn" onclick={() => togglePanel("audit")} aria-pressed={showAudit}>Auditoria</button>
    </nav>
  </header>

  <div class="stage-wrap">
    <div class="stage" bind:this={container}></div>

    {#if tray.dice.length === 0}
      <p class="empty-hint">Adicione um dado acima ou clique num dado na cena para rolar.</p>
    {/if}

    {#if showCustomEditor}
      <CustomDieEditor onCreate={handleCreateCustom} onClose={() => (showCustomEditor = false)} />
    {/if}
    {#if showCalculator}
      <CalculatorPanel {diceValues} onClose={() => (showCalculator = false)} />
    {/if}
    {#if showAudit}
      <AuditPanel onClose={() => (showAudit = false)} />
    {/if}
  </div>

  <footer class="controls">
    <button class="roll-btn" onclick={rollAll} disabled={rollingAll || tray.dice.length === 0}>
      {rollingAll ? "Rolando..." : "Rolar tudo"}
    </button>

    <div class="tray-list">
      {#each chips as chip (chip.chipId)}
        <span class="chip">
          {chip.label}: <strong>{chip.value}</strong>
          <button class="chip-remove" onclick={() => handleRemove(chip.chipId)} aria-label={`Remover ${chip.label}`}>×</button>
        </span>
      {/each}
    </div>

    {#if errorMessage}
      <span class="error" role="alert">{errorMessage}</span>
    {/if}
  </footer>

  <p class="sr-only" role="status" aria-live="polite">{lastRollAnnouncement}</p>
</main>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.9rem 1.4rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .topbar h1 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    white-space: nowrap;
  }

  .add-buttons {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .divider {
    width: 1px;
    height: 1.1rem;
    background: var(--color-border-strong);
    margin: 0 0.15rem;
  }

  .add-btn {
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-text);
    padding: 0.35rem 0.7rem;
    font-size: 0.85rem;
    font-weight: 600;
    transition:
      background-color 0.15s,
      color 0.15s;
  }

  .add-btn:hover {
    background: var(--color-surface-muted);
  }

  .add-btn[aria-pressed="true"] {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: var(--color-accent-contrast);
  }

  .stage-wrap {
    position: relative;
    flex: 1;
    min-height: 0;
  }

  .stage {
    width: 100%;
    height: 100%;
  }

  .stage :global(canvas) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .empty-hint {
    position: absolute;
    top: 1.4rem;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    padding: 0.5rem 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-pill);
    font-size: 0.85rem;
    color: var(--color-text-muted);
    box-shadow: var(--shadow-sm);
    pointer-events: none;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.4rem;
    border-top: 1px solid var(--color-border);
    background: var(--color-surface);
    flex-wrap: wrap;
  }

  .roll-btn {
    border: none;
    border-radius: var(--radius-md);
    background: var(--color-accent);
    color: var(--color-accent-contrast);
    padding: 0.65rem 1.4rem;
    font-size: 0.95rem;
    font-weight: 650;
    transition: opacity 0.15s;
  }

  .roll-btn:disabled {
    opacity: 0.45;
  }

  .roll-btn:not(:disabled):hover {
    opacity: 0.88;
  }

  .tray-list {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    flex: 1;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: var(--color-surface-muted);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-pill);
    padding: 0.3rem 0.5rem 0.3rem 0.8rem;
    font-size: 0.9rem;
  }

  .chip-remove {
    border: none;
    background: transparent;
    color: var(--color-text-faint);
    font-size: 1rem;
    line-height: 1;
    padding: 0.1rem 0.35rem;
    border-radius: var(--radius-pill);
  }

  .chip-remove:hover {
    background: var(--color-bg);
    color: var(--color-text);
  }

  .error {
    color: var(--color-danger);
  }
</style>
