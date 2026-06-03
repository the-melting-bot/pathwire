<script lang="ts">
  import { onMount } from 'svelte';
  import Canvas from './lib/components/Canvas.svelte';
  import { 
    addNode, 
    runWorkflow, 
    isRunning, 
    nodes, 
    connections,
    zoom,
    panX,
    panY,
    selectedNodeId
  } from './lib/store';
  import { 
    Play, 
    Plus, 
    RefreshCw, 
    Compass, 
    ZoomIn, 
    ZoomOut, 
    HelpCircle, 
    Sparkles, 
    GitCommit, 
    FileCode, 
    Info 
  } from '@lucide/svelte';

  let showHelp = $state(true);

  // Setup a default demo workflow on mount to WOW the user immediately!
  onMount(() => {
    loadTemplate();
  });

  function loadTemplate() {
    // Clear existing
    nodes.set([]);
    connections.set([]);
    selectedNodeId.set(null);
    zoom.set(0.95);
    panX.set(40);
    panY.set(20);

    // Add nodes
    addNode('input', 80, 220);
    addNode('scrubber', 420, 100);
    addNode('prompt', 420, 360);
    addNode('output', 800, 240);

    // Defer connections slightly to allow Svelte 5 to create DOM port elements
    setTimeout(() => {
      const allNodes = $nodes;
      const inputNode = allNodes.find((n) => n.type === 'input');
      const scrubNode = allNodes.find((n) => n.type === 'scrubber');
      const promptNode = allNodes.find((n) => n.type === 'prompt');
      const outputNode = allNodes.find((n) => n.type === 'output');

      if (inputNode && scrubNode && promptNode && outputNode) {
        connections.set([
          // Input -> Scrubber
          {
            id: 'conn-1',
            fromNodeId: inputNode.id,
            fromPortId: 'out',
            toNodeId: scrubNode.id,
            toPortId: 'in'
          },
          // Input -> AI Prompt
          {
            id: 'conn-2',
            fromNodeId: inputNode.id,
            fromPortId: 'out',
            toNodeId: promptNode.id,
            toPortId: 'in'
          },
          // AI Prompt -> Terminal Output
          {
            id: 'conn-3',
            fromNodeId: promptNode.id,
            fromPortId: 'out',
            toNodeId: outputNode.id,
            toPortId: 'in'
          }
        ]);
      }
    }, 100);
  }

  function handleAddNode(type: 'input' | 'scrubber' | 'prompt' | 'output') {
    // Add node near center of screen
    const x = 200 - $panX;
    const y = 250 - $panY;
    addNode(type, x, y);
  }

  function resetView() {
    zoom.set(1);
    panX.set(100);
    panY.set(100);
  }
</script>

<main class="app-container">
  <!-- Top Control Bar -->
  <header class="top-bar glass">
    <!-- Logo & Title -->
    <div class="logo-area">
      <svg class="logo-icon" width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect x="2.5" y="2.5" width="27" height="27" rx="8" stroke="url(#logoGlow)" stroke-width="2" stroke-dasharray="2 3" opacity="0.6"/>
        <path d="M8 10L16 20L24 10" stroke="#00E5FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="16" cy="23.5" r="2.5" fill="#8d57eb" />
        <defs>
          <linearGradient id="logoGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#00E5FF" />
            <stop offset="100%" stop-color="#8d57eb" />
          </linearGradient>
        </defs>
      </svg>
      <div class="logo-text">
        <span class="brand-name">pathwire</span><span class="brand-suffix">.ai</span>
      </div>
      <div class="version-tag">v1.0.0-beta</div>
    </div>

    <!-- Toolbar: Adding Nodes -->
    <div class="toolbar">
      <button class="tool-btn add-input" onclick={() => handleAddNode('input')}>
        <Plus size={14} /> Add Source
      </button>
      <button class="tool-btn add-scrubber" onclick={() => handleAddNode('scrubber')}>
        <Plus size={14} /> Add Scrubber
      </button>
      <button class="tool-btn add-prompt" onclick={() => handleAddNode('prompt')}>
        <Plus size={14} /> Add AI Prompt
      </button>
      <button class="tool-btn add-output" onclick={() => handleAddNode('output')}>
        <Plus size={14} /> Add Terminal
      </button>
    </div>

    <!-- Execution Panel -->
    <div class="execution-actions">
      <button class="template-btn" onclick={loadTemplate} title="Reset to template">
        <RefreshCw size={14} />
      </button>
      <button 
        class="run-btn glow-btn" 
        onclick={runWorkflow} 
        disabled={$isRunning}
      >
        {#if $isRunning}
          <div class="btn-spinner"></div> Running...
        {:else}
          <Play size={14} fill="currentColor" /> Run Workflow
        {/if}
      </button>
    </div>
  </header>

  <!-- Interactive Editor Canvas -->
  <Canvas />

  <!-- View Controls Overlay (Bottom-Left) -->
  <div class="view-controls glass">
    <button onclick={() => zoom.update(z => Math.max(0.3, z - 0.1))} title="Zoom Out"><ZoomOut size={16} /></button>
    <span class="zoom-percent">{Math.round($zoom * 100)}%</span>
    <button onclick={() => zoom.update(z => Math.min(2, z + 0.1))} title="Zoom In"><ZoomIn size={16} /></button>
    <div class="divider"></div>
    <button onclick={resetView} title="Center View"><Compass size={16} /></button>
    <div class="divider"></div>
    <button onclick={() => showHelp = !showHelp} class:active={showHelp} title="Show Help"><HelpCircle size={16} /></button>
  </div>

  <!-- Help & Onboarding Overlay (Bottom-Right) -->
  {#if showHelp}
    <div class="help-overlay glass">
      <div class="help-header">
        <div class="help-title">
          <Sparkles size={14} style="color: #00E5FF;" /> How to use Pathwire
        </div>
        <button class="close-help" onclick={() => showHelp = false}><X size={12} /></button>
      </div>
      <ul class="help-steps">
        <li>
          <div class="step-num">1</div>
          <span><strong>Drag Outward:</strong> Drag output ports (right dots) to input ports (left dots) to connect.</span>
        </li>
        <li>
          <div class="step-num">2</div>
          <span><strong>Double-Click Wires:</strong> Double-click any cable to delete a connection wire.</span>
        </li>
        <li>
          <div class="step-num">3</div>
          <span><strong>Execute Pipeline:</strong> Click <strong>Run Workflow</strong> to watch data pulse down the wires and execute.</span>
        </li>
      </ul>
      <div class="help-footer">
        <Info size={12} />
        <span>Preloaded template is ready! Click "Run" to test.</span>
      </div>
    </div>
  {/if}
</main>

<style>
  .app-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }

  /* Control Top-bar */
  .top-bar {
    position: fixed;
    top: 16px;
    left: 16px;
    right: 16px;
    height: 60px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    z-index: 100;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .logo-area {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .logo-text {
    display: flex;
    align-items: baseline;
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
  }

  .brand-name {
    color: hsl(var(--text-bright));
    letter-spacing: -0.01em;
  }

  .brand-suffix {
    color: #00E5FF;
    font-weight: 900;
  }

  .version-tag {
    font-size: 9px;
    font-family: var(--font-mono);
    color: hsl(var(--text-faint));
    background: rgba(255, 255, 255, 0.04);
    padding: 2px 6px;
    border-radius: 4px;
    margin-left: 4px;
  }

  /* Toolbar adds */
  .toolbar {
    display: flex;
    gap: 8px;
  }

  .tool-btn {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-md);
    color: hsl(var(--text-muted));
    font-family: var(--font-display);
    font-size: 11px;
    font-weight: 600;
    padding: 8px 14px;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.25s ease;
  }

  .tool-btn:hover {
    color: hsl(var(--text-bright));
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .add-input:hover { border-color: rgba(0, 229, 255, 0.4); }
  .add-scrubber:hover { border-color: rgba(243, 154, 25, 0.4); }
  .add-prompt:hover { border-color: rgba(141, 87, 235, 0.4); }
  .add-output:hover { border-color: rgba(16, 185, 129, 0.4); }

  /* Execution Panel */
  .execution-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .template-btn {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-md);
    width: 36px;
    height: 36px;
    color: hsl(var(--text-muted));
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .template-btn:hover {
    color: hsl(var(--text-bright));
    background: rgba(255, 255, 255, 0.08);
  }

  .run-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    min-width: 140px;
    justify-content: center;
    height: 36px;
    padding: 0 16px;
  }

  .btn-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: white;
    border-radius: 50%;
    animation: btnSpin 0.6s linear infinite;
  }

  @keyframes btnSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* View Controls overlays */
  .view-controls {
    position: fixed;
    bottom: 24px;
    left: 24px;
    height: 38px;
    display: flex;
    align-items: center;
    padding: 0 8px;
    border-radius: var(--radius-md);
    border: 1px solid rgba(255, 255, 255, 0.04);
    z-index: 100;
  }

  .view-controls button {
    background: transparent;
    border: none;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: hsl(var(--text-muted));
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .view-controls button:hover {
    color: hsl(var(--text-bright));
    background: rgba(255, 255, 255, 0.05);
  }

  .view-controls button.active {
    color: #00E5FF;
    background: rgba(0, 229, 255, 0.06);
  }

  .zoom-percent {
    font-family: var(--font-mono);
    font-size: 10px;
    color: hsl(var(--text-faint));
    padding: 0 6px;
    min-width: 32px;
    text-align: center;
  }

  .divider {
    width: 1px;
    height: 16px;
    background: rgba(255, 255, 255, 0.06);
    margin: 0 4px;
  }

  /* Help Card overlay */
  .help-overlay {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 300px;
    border-radius: var(--radius-lg);
    border: 1px solid rgba(255, 255, 255, 0.04);
    padding: 16px;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .help-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .help-title {
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 600;
    color: hsl(var(--text-bright));
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .close-help {
    background: transparent;
    border: none;
    color: hsl(var(--text-faint));
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-help:hover {
    color: hsl(var(--text-bright));
  }

  .help-steps {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .help-steps li {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .step-num {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #00E5FF;
    border-radius: 4px;
    width: 16px;
    height: 16px;
    font-size: 9px;
    font-family: var(--font-mono);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .help-steps span {
    font-size: 11px;
    color: hsl(var(--text-normal));
    line-height: 1.4;
  }

  .help-footer {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(0, 229, 255, 0.03);
    border: 1px solid rgba(0, 229, 255, 0.08);
    padding: 8px;
    border-radius: 6px;
    font-size: 9px;
    color: #00E5FF;
  }
</style>
