<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    nodes, 
    selectedNodeId, 
    zoom, 
    deleteNode, 
    startDraggingConnection, 
    completeDraggingConnection,
    draggingConnection
  } from '../store';
  import type { Node as NodeType } from '../types';
  import { Play, Trash2, Cpu, FileInput, FileText, Settings, X, Terminal, Download, FileJson } from '@lucide/svelte';

  interface Props {
    node: NodeType;
  }

  let { node }: Props = $props();

  let cardEl: HTMLElement;
  let isDragging = $state(false);
  let startX = 0;
  let startY = 0;

  // Track selection state
  let isSelected = $derived($selectedNodeId === node.id);

  // Setup dragging
  function handleHeaderPointerDown(e: PointerEvent) {
    if ((e.target as HTMLElement).closest('.node-control') || (e.target as HTMLElement).closest('.port-dot')) {
      return; // Prevent dragging when clicking controls or ports
    }
    
    e.preventDefault();
    selectedNodeId.set(node.id);
    isDragging = true;
    
    // Capture current pointer coordinates and node starting coords
    startX = e.clientX;
    startY = e.clientY;
    
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging) return;
    
    const dx = (e.clientX - startX) / $zoom;
    const dy = (e.clientY - startY) / $zoom;
    
    nodes.update((list) =>
      list.map((n) => {
        if (n.id === node.id) {
          return { ...n, x: n.x + dx, y: n.y + dy };
        }
        return n;
      })
    );
    
    startX = e.clientX;
    startY = e.clientY;
  }

  function handlePointerUp() {
    isDragging = false;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }

  // Handle connection drawing
  function handlePortPointerDown(e: PointerEvent, portId: string, isInput: boolean) {
    e.stopPropagation();
    if (isInput) return; // Connections drag from output ports
    
    const dot = e.target as HTMLElement;
    const rect = dot.getBoundingClientRect();
    const canvasEl = document.querySelector('.canvas-viewport') as HTMLElement;
    const canvasRect = canvasEl.getBoundingClientRect();
    
    // Calculate coordinates in canvas coordinate system
    const startX = (rect.left + rect.width / 2 - canvasRect.left) / $zoom;
    const startY = (rect.top + rect.height / 2 - canvasRect.top) / $zoom;
    
    startDraggingConnection(node.id, portId, startX, startY);
  }

  function handlePortPointerUp(e: PointerEvent, portId: string, isInput: boolean) {
    e.stopPropagation();
    if (!isInput) return; // Drag drops onto input ports
    completeDraggingConnection(node.id, portId);
  }

  // Handle dynamic field changes
  function updateParam(key: string, value: any) {
    nodes.update((list) =>
      list.map((n) => {
        if (n.id === node.id) {
          return { ...n, params: { ...n.params, [key]: value } };
        }
        return n;
      })
    );
  }

  // Trigger download of the output value
  function downloadOutput() {
    const text = node.inputValues['in'] || '';
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pathwire-output-${node.id.substring(5)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={cardEl}
  class="node-card glass"
  class:selected={isSelected}
  class:status-running={node.status === 'running'}
  class:status-success={node.status === 'success'}
  class:status-error={node.status === 'error'}
  style="
    transform: translate({node.x}px, {node.y}px);
    --node-accent: var(--color-{node.type});
  "
  onpointerdown={() => selectedNodeId.set(node.id)}
>
  <!-- Left accent glow line -->
  <div class="node-accent-bar" style="background-color: hsl(var(--node-accent))"></div>

  <!-- Header -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="node-header" onpointerdown={handleHeaderPointerDown}>
    <div class="node-header-icon" style="color: hsl(var(--node-accent))">
      {#if node.type === 'input'}
        <FileInput size={16} />
      {:else if node.type === 'scrubber'}
        <Settings size={16} />
      {:else if node.type === 'prompt'}
        <Cpu size={16} />
      {:else if node.type === 'output'}
        <Terminal size={16} />
      {/if}
    </div>
    <span class="node-title">{node.name}</span>
    <button class="node-control btn-delete" onclick={() => deleteNode(node.id)} title="Delete node">
      <X size={14} />
    </button>
  </div>

  <!-- Input and Output Ports -->
  <div class="ports-container">
    <!-- Input Ports (Left) -->
    <div class="ports-column ports-left">
      {#each node.inputs as port}
        <div class="port-row">
          <div
            id="port-dot-{node.id}-{port.id}"
            class="port-dot input-port"
            class:connected={Object.keys(node.inputValues).includes(port.id)}
            onpointerup={(e) => handlePortPointerUp(e, port.id, true)}
            role="button"
            tabindex="0"
          ></div>
          <span class="port-label">{port.name}</span>
        </div>
      {/each}
    </div>

    <!-- Output Ports (Right) -->
    <div class="ports-column ports-right">
      {#each node.outputs as port}
        <div class="port-row">
          <span class="port-label">{port.name}</span>
          <div
            id="port-dot-{node.id}-{port.id}"
            class="port-dot output-port"
            onpointerdown={(e) => handlePortPointerDown(e, port.id, false)}
            role="button"
            tabindex="0"
          ></div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Controls / Editor Body -->
  <div class="node-body">
    {#if node.type === 'input'}
      <div class="form-group">
        <label for="input-text">Source Text</label>
        <textarea
          id="input-text"
          class="node-control node-textarea"
          value={node.params.text}
          oninput={(e) => updateParam('text', (e.target as HTMLTextAreaElement).value)}
          placeholder="Enter text payload..."
        ></textarea>
      </div>
    {:else if node.type === 'scrubber'}
      <div class="form-group">
        <label for="scrub-mode">Scrubbing Mode</label>
        <select
          id="scrub-mode"
          class="node-control node-select"
          value={node.params.mode}
          onchange={(e) => updateParam('mode', (e.target as HTMLSelectElement).value)}
        >
          <option value="clean-whitespace">Clean Extra Whitespace</option>
          <option value="uppercase">ALL UPPERCASE</option>
          <option value="strip-emojis">Strip Emojis</option>
          <option value="slugify">Generate url-slug</option>
        </select>
      </div>
      {#if node.inputValues['in']}
        <div class="live-preview">
          <span class="preview-title">Input Preview:</span>
          <div class="preview-text">{node.inputValues['in']}</div>
        </div>
      {/if}
    {:else if node.type === 'prompt'}
      <div class="form-group">
        <label for="gemini-prompt">AI System Prompt</label>
        <textarea
          id="gemini-prompt"
          class="node-control node-textarea prompt-textarea"
          value={node.params.prompt}
          oninput={(e) => updateParam('prompt', (e.target as HTMLTextAreaElement).value)}
          placeholder="Summarize, expand, rewrite..."
        ></textarea>
      </div>
      {#if node.inputValues['in']}
        <div class="live-preview">
          <span class="preview-title">Context Preview:</span>
          <div class="preview-text">{node.inputValues['in']}</div>
        </div>
      {/if}
    {:else if node.type === 'output'}
      <div class="form-group">
        <div class="terminal-header">
          <label for="console-out">Console Logs</label>
          {#if node.inputValues['in']}
            <button class="node-control terminal-btn" onclick={downloadOutput} title="Download Text">
              <Download size={12} />
            </button>
          {/if}
        </div>
        <div id="console-out" class="terminal-body">
          {#if node.inputValues['in']}
            <code class="terminal-text">{node.inputValues['in']}</code>
          {:else}
            <span class="terminal-placeholder">Piping empty... Connect a node and hit Run.</span>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Processing Indicator -->
  {#if node.status === 'running'}
    <div class="node-loader">
      <div class="loader-spinner" style="border-top-color: hsl(var(--node-accent))"></div>
    </div>
  {/if}
</div>

<style>
  .node-card {
    position: absolute;
    width: 250px;
    border-radius: var(--radius-lg);
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    z-index: 10;
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
    overflow: hidden;
  }

  .node-card.selected {
    border-color: hsl(var(--node-accent));
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.05), 0 0 25px rgba(255, 255, 255, 0.02);
  }

  .node-accent-bar {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 4px;
  }

  .node-header {
    display: flex;
    align-items: center;
    padding: 10px 14px 10px 18px;
    background: rgba(255, 255, 255, 0.02);
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    cursor: grab;
  }

  .node-header:active {
    cursor: grabbing;
  }

  .node-header-icon {
    display: flex;
    align-items: center;
    margin-right: 10px;
  }

  .node-title {
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 600;
    color: hsl(var(--text-bright));
    flex-grow: 1;
    letter-spacing: 0.01em;
  }

  .node-control {
    background: transparent;
    border: none;
    cursor: pointer;
    color: hsl(var(--text-faint));
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease;
  }

  .btn-delete:hover {
    color: #ef4444;
  }

  /* Ports Area */
  .ports-container {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    background: rgba(255, 255, 255, 0.01);
  }

  .ports-column {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ports-left {
    align-items: flex-start;
  }

  .ports-right {
    align-items: flex-end;
  }

  .port-row {
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
  }

  .ports-left .port-row {
    margin-left: -5px;
  }

  .ports-right .port-row {
    margin-right: -5px;
  }

  .port-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: hsl(var(--bg-port));
    border: 2.5px solid hsl(var(--bg-card));
    cursor: crosshair;
    transition: background-color 0.2s ease, transform 0.15s ease;
  }

  .port-dot:hover {
    transform: scale(1.3);
    background: hsl(var(--node-accent));
  }

  .port-dot.connected {
    background: hsl(var(--node-accent));
  }

  .port-label {
    font-size: 10px;
    color: hsl(var(--text-muted));
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 500;
    pointer-events: none;
  }

  /* Body & Controls */
  .node-body {
    padding: 12px 16px 16px 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.03);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-group label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: hsl(var(--text-muted));
  }

  .node-textarea, .node-select {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: var(--radius-md);
    padding: 6px 10px;
    font-size: 11px;
    color: hsl(var(--text-normal));
    font-family: var(--font-sans);
    transition: border-color 0.2s ease, background-color 0.2s ease;
  }

  .node-textarea:focus, .node-select:focus {
    border-color: hsl(var(--node-accent));
    outline: none;
    background: rgba(255, 255, 255, 0.04);
  }

  .node-textarea {
    resize: none;
    height: 60px;
  }

  .prompt-textarea {
    height: 80px;
  }

  /* Preview Section */
  .live-preview {
    margin-top: 8px;
    background: rgba(255, 255, 255, 0.015);
    border-radius: 6px;
    padding: 6px;
    border: 1px dashed rgba(255, 255, 255, 0.04);
  }

  .preview-title {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: hsl(var(--text-faint));
    display: block;
    margin-bottom: 2px;
  }

  .preview-text {
    font-size: 10px;
    color: hsl(var(--text-muted));
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Output Terminal */
  .terminal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .terminal-btn {
    padding: 4px;
    border-radius: 4px;
  }

  .terminal-btn:hover {
    color: hsl(var(--text-bright));
    background: rgba(255, 255, 255, 0.05);
  }

  .terminal-body {
    background: #020408;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-md);
    padding: 8px;
    height: 80px;
    overflow-y: auto;
    font-family: var(--font-mono);
  }

  .terminal-text {
    font-size: 9px;
    color: #4ade80;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .terminal-placeholder {
    font-size: 9px;
    color: hsl(var(--text-faint));
  }

  /* Loading State Overlay */
  .node-loader {
    position: absolute;
    inset: 0;
    background: rgba(15, 20, 34, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 12;
    backdrop-filter: blur(2px);
  }

  .loader-spinner {
    width: 28px;
    height: 28px;
    border: 2px solid rgba(255, 255, 255, 0.08);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Status Colors */
  .status-success {
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.05);
  }

  .status-error {
    border-color: #ef4444 !important;
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.08);
  }
</style>
