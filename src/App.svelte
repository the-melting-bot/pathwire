<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    levels,
    currentLevelId,
    gameWon,
    moves,
    timeElapsed,
    isRunning,
    vertices,
    edges,
    loadLevel,
    resetLevel,
    checkIntersections,
    solveCurrentLevel,
    isAnimatingSolve
  } from './lib/store';
  import { 
    RefreshCw, 
    HelpCircle, 
    Sparkles, 
    X,
    Gamepad2,
    ChevronRight,
    Timer,
    Activity,
    Trophy,
    Info,
    Wand2
  } from '@lucide/svelte';

  let showHelp = $state(false);
  let svgElement: SVGSVGElement | null = $state(null);
  let draggingVertexId: string | null = $state(null);

  // Setup the first level on mount to start the game
  onMount(() => {
    loadLevel(1);
  });

  // Helper to format time as MM:SS
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Get active level details
  let activeLevel = $derived(levels.find(l => l.id === $currentLevelId) || levels[0]);
  let formattedTime = $derived(formatTime($timeElapsed));

  // Pointer position translation helper
  function getSvgCoords(clientX: number, clientY: number) {
    if (!svgElement) return { x: 200, y: 200 };
    const rect = svgElement.getBoundingClientRect();
    // Scale client coords to viewBox coords (0..400)
    const x = ((clientX - rect.left) / rect.width) * 400;
    const y = ((clientY - rect.top) / rect.height) * 400;
    // Constrain points inside margins to keep them on the game board
    return {
      x: Math.max(15, Math.min(385, x)),
      y: Math.max(15, Math.min(385, y))
    };
  }

  function handlePointerDown(event: PointerEvent, id: string) {
    if ($isAnimatingSolve) return;
    event.preventDefault();
    const el = event.currentTarget as HTMLElement | SVGElement;
    try {
      el.setPointerCapture(event.pointerId);
    } catch (err) {
      console.warn("Failed to set pointer capture:", err);
    }
    draggingVertexId = id;
    moves.update(m => m + 1);
  }

  function handlePointerMove(event: PointerEvent, id: string) {
    if (draggingVertexId !== id) return;
    const { x, y } = getSvgCoords(event.clientX, event.clientY);
    vertices.update(vList => vList.map(v => v.id === id ? { ...v, x, y } : v));
    checkIntersections();
  }

  function handlePointerUp(event: PointerEvent, id: string) {
    if (draggingVertexId === id) {
      draggingVertexId = null;
      const el = event.currentTarget as HTMLElement | SVGElement;
      try {
        el.releasePointerCapture(event.pointerId);
      } catch (err) {
        // Already released or failed
      }
    }
  }

  function nextLevel() {
    if ($currentLevelId < levels.length) {
      loadLevel($currentLevelId + 1);
    }
  }
</script>

<main class="app-container">
  <!-- Interactive background elements -->
  <div class="grid-pattern"></div>
  <div class="ambient-glows">
    <div class="glow-sphere pink"></div>
    <div class="glow-sphere cyan"></div>
  </div>

  <!-- Main Device Frame -->
  <div class="device-frame">
    <!-- Header -->
    <header class="game-header">
      <div class="logo-area">
        <Gamepad2 size={22} style="color: #00E5FF; filter: drop-shadow(0 0 4px #00E5FF);" />
        <h1 class="logo-text">PATH<span>WIRE</span></h1>
      </div>
      <button class="help-btn" onclick={() => showHelp = !showHelp} class:active={showHelp} title="How to play">
        <HelpCircle size={18} />
      </button>
    </header>

    <!-- Stats Panel -->
    <div class="stats-dashboard">
      <div class="stat-card">
        <span class="stat-label">Level</span>
        <span class="stat-value" style="color: #00E5FF;">{activeLevel.id}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label"><Activity size={10} style="display:inline; margin-right:2px; vertical-align:middle;" /> Moves</span>
        <span class="stat-value">{$moves}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label"><Timer size={10} style="display:inline; margin-right:2px; vertical-align:middle;" /> Time</span>
        <span class="stat-value">{formattedTime}</span>
      </div>
    </div>

    <!-- Instruction Strip -->
    <div class="level-info">
      <div class="info-content">
        <Info size={14} style="color: #00E5FF; flex-shrink: 0; margin-top: 1px;" />
        <p class="description-text"><strong>{activeLevel.name}:</strong> {activeLevel.description}</p>
      </div>
    </div>

    <!-- Canvas Area -->
    <div class="canvas-container">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <svg 
        bind:this={svgElement}
        viewBox="0 0 400 400" 
        class="svg-canvas"
        class:animating={$isAnimatingSolve}
      >
        <defs>
          <!-- Pink Neon Glow -->
          <filter id="glow-pink" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          <!-- Cyan Neon Glow -->
          <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <!-- Connection Wires (Edges) -->
        {#each $edges as edge (edge.id)}
          {@const fromV = $vertices.find(v => v.id === edge.from)}
          {@const toV = $vertices.find(v => v.id === edge.to)}
          {#if fromV && toV}
            <line
              x1={fromV.x}
              y1={fromV.y}
              x2={toV.x}
              y2={toV.y}
              class="edge {edge.isIntersecting ? 'edge-intersecting' : 'edge-clean'}"
            />
          {/if}
        {/each}

        <!-- Vertices -->
        {#each $vertices as vertex (vertex.id)}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <g
            class="vertex-group"
            class:dragging={draggingVertexId === vertex.id}
            transform="translate({vertex.x}, {vertex.y})"
            onpointerdown={(e) => handlePointerDown(e, vertex.id)}
            onpointermove={(e) => handlePointerMove(e, vertex.id)}
            onpointerup={(e) => handlePointerUp(e, vertex.id)}
          >
            <circle cx="0" cy="0" r="18" class="vertex-glow" />
            <circle cx="0" cy="0" r="8" class="vertex-point" />
          </g>
        {/each}
      </svg>
    </div>

    <!-- Navigation / Reset Controls -->
    <div class="level-select-container">
      <select 
        class="level-select" 
        value={$currentLevelId} 
        onchange={(e) => loadLevel(parseInt((e.target as HTMLSelectElement).value))}
      >
        {#each levels as lvl}
          <option value={lvl.id}>Level {lvl.id}: {lvl.name}</option>
        {/each}
      </select>
      
      <button class="reset-btn" onclick={resetLevel} title="Reset level layout">
        <RefreshCw size={16} />
      </button>
    </div>

    <!-- Help Screen Overlay -->
    {#if showHelp}
      <div class="help-panel glass">
        <div class="help-header">
          <div class="help-title">
            <Sparkles size={14} style="color: #00E5FF; margin-right: 4px;" /> How to Play
          </div>
          <button class="close-help-btn" onclick={() => showHelp = false}>
            <X size={16} />
          </button>
        </div>
        <div class="help-body">
          <div class="instruction-item">
            <div class="step-badge">1</div>
            <p><strong>Goal:</strong> Drag the neon dots (vertices) around the screen to untangle the wire mesh.</p>
          </div>
          <div class="instruction-item">
            <div class="step-badge">2</div>
            <p><strong>Pink Wires:</strong> Intersecting/crossing lines glow <span class="text-pink">hot pink</span>.</p>
          </div>
          <div class="instruction-item">
            <div class="step-badge">3</div>
            <p><strong>Cyan Wires:</strong> Clean, untangled paths glow <span class="text-cyan">neon cyan</span>.</p>
          </div>
          <div class="instruction-item">
            <div class="step-badge">4</div>
            <p><strong>Solve:</strong> Rearrange all dots so that zero wires cross, lighting up the entire mesh!</p>
          </div>
        </div>
        
        <div class="help-solution-footer">
          <p class="solution-text">Stuck on this level? Let the game calibrate the optimal vertex coordinates for you.</p>
          <button class="solve-btn" onclick={() => { showHelp = false; solveCurrentLevel(); }}>
            <Wand2 size={13} style="margin-right: 6px; display: inline-block; vertical-align: middle;" /> Auto-Solve Puzzle
          </button>
        </div>
      </div>
    {/if}

    <!-- Victory Screen Modal Overlay -->
    {#if $gameWon}
      <div class="win-modal-backdrop">
        <div class="win-modal">
          <div class="win-icon-wrapper">
            <Trophy size={40} style="color: #00E5FF; filter: drop-shadow(0 0 8px #00E5FF);" />
          </div>
          <h2 class="win-title">SYSTEM UNTANGLED</h2>
          <p class="win-subtitle">Level {activeLevel.id} fully calibrated.</p>
          
          <div class="win-stats-grid">
            <div class="win-stat-item">
              <span class="win-stat-label">Moves</span>
              <span class="win-stat-val">{$moves}</span>
            </div>
            <div class="win-stat-item">
              <span class="win-stat-label">Time</span>
              <span class="win-stat-val">{formattedTime}</span>
            </div>
          </div>
          
          <div class="win-actions">
            <button class="modal-btn secondary" onclick={resetLevel}>
              Replay
            </button>
            
            {#if $currentLevelId < levels.length}
              <button class="modal-btn primary" onclick={nextLevel}>
                Next Level <ChevronRight size={16} style="margin-left: 4px;" />
              </button>
            {:else}
              <div class="completion-badge">
                <Sparkles size={14} style="margin-right: 4px;" /> All Levels Cleared!
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>
</main>

<style>
  .app-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100vw;
    height: 100vh;
    background: radial-gradient(circle at center, #0e172a 0%, #030712 100%);
    overflow: hidden;
    position: relative;
  }

  /* Grid pattern layer */
  .grid-pattern {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(to right, rgba(0, 229, 255, 0.03) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(0, 229, 255, 0.03) 1px, transparent 1px);
    background-size: 30px 30px;
    mask-image: radial-gradient(circle, black 35%, transparent 75%);
    -webkit-mask-image: radial-gradient(circle, black 35%, transparent 75%);
    pointer-events: none;
    z-index: 1;
  }

  /* Floating background ambiance */
  .ambient-glows {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
  }
  
  .glow-sphere {
    position: absolute;
    border-radius: 50%;
    filter: blur(120px);
    opacity: 0.12;
    mix-blend-mode: screen;
  }
  
  .glow-sphere.pink {
    width: 350px;
    height: 350px;
    background: #FF3366;
    top: -80px;
    left: -80px;
    animation: float 20s infinite ease-in-out alternate;
  }
  
  .glow-sphere.cyan {
    width: 450px;
    height: 450px;
    background: #00E5FF;
    bottom: -120px;
    right: -80px;
    animation: float 25s infinite ease-in-out alternate-reverse;
  }
  
  @keyframes float {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(50px, 30px) scale(1.08); }
  }

  /* Simulated Mobile Device Frame */
  .device-frame {
    width: 100%;
    max-width: 440px;
    height: 100%;
    max-height: 800px;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 36px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5),
                0 0 50px rgba(0, 229, 255, 0.05);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    z-index: 10;
  }

  @media (max-width: 500px) {
    .device-frame {
      max-width: 100%;
      max-height: 100%;
      border-radius: 0;
      border: none;
    }
  }

  /* Header area */
  .game-header {
    padding: 16px 20px 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .logo-area {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .logo-text {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 0.06em;
    color: #ffffff;
    margin: 0;
    text-shadow: 0 0 8px rgba(0, 229, 255, 0.2);
  }

  .logo-text span {
    color: #00E5FF;
  }

  .help-btn {
    background: transparent;
    border: none;
    color: hsl(var(--text-muted));
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border-radius: 50%;
    transition: all 0.2s;
  }

  .help-btn:hover, .help-btn.active {
    color: #00E5FF;
    background: rgba(0, 229, 255, 0.06);
  }

  /* Stats Dashboard */
  .stats-dashboard {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    padding: 12px 20px;
    background: rgba(0, 0, 0, 0.15);
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  }

  .stat-card {
    background: rgba(255, 255, 255, 0.01);
    border: 1px solid rgba(255, 255, 255, 0.03);
    border-radius: 10px;
    padding: 6px 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .stat-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: hsl(var(--text-muted));
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-value {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 700;
    color: #ffffff;
  }

  /* Level Instructions box */
  .level-info {
    padding: 10px 20px;
    background: rgba(0, 229, 255, 0.01);
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  }

  .info-content {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }

  .description-text {
    font-size: 11px;
    margin: 0;
    color: hsl(var(--text-normal));
    line-height: 1.35;
  }

  .description-text strong {
    color: #00E5FF;
  }

  /* Canvas Container & SVG */
  .canvas-container {
    flex-grow: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    position: relative;
  }

  .svg-canvas {
    width: 100%;
    aspect-ratio: 1;
    background: rgba(5, 8, 16, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 20px;
    box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.7);
    overflow: visible;
    touch-action: none; /* Crucial for preventing scroll gestures while dragging */
  }

  .svg-canvas.animating {
    cursor: default;
  }

  .svg-canvas.animating .vertex-group {
    pointer-events: none;
  }

  /* Vector wire styles */
  .edge {
    stroke-width: 3.5;
    stroke-linecap: round;
    transition: stroke 0.2s ease, filter 0.2s ease;
  }

  .edge-intersecting {
    stroke: #FF3366;
    filter: url(#glow-pink);
  }

  .edge-clean {
    stroke: #00E5FF;
    filter: url(#glow-cyan);
  }

  /* Vertex point styling */
  .vertex-group {
    cursor: grab;
    transform-box: fill-box;
    transform-origin: center;
  }

  .vertex-group:active {
    cursor: grabbing;
  }

  .vertex-glow {
    fill: rgba(0, 229, 255, 0.06);
    stroke: transparent;
    transition: r 0.2s ease, fill 0.2s ease;
  }

  .vertex-group:hover .vertex-glow {
    r: 22px;
    fill: rgba(0, 229, 255, 0.12);
  }

  .vertex-point {
    fill: #060912;
    stroke: #00E5FF;
    stroke-width: 2.5;
    transition: stroke-width 0.2s, stroke 0.2s, r 0.2s;
  }

  .vertex-group:hover .vertex-point {
    stroke-width: 3.5;
    r: 9.5px;
    stroke: #ffffff;
    filter: drop-shadow(0 0 4px #00E5FF);
  }

  .vertex-group.dragging .vertex-point {
    stroke: #FF3366;
    stroke-width: 4;
    r: 10px;
    filter: drop-shadow(0 0 6px #FF3366);
  }

  .vertex-group.dragging .vertex-glow {
    fill: rgba(255, 51, 102, 0.12);
    r: 24px;
  }

  /* Dropdown and reset button controls */
  .level-select-container {
    padding: 12px 20px;
    display: flex;
    gap: 10px;
    align-items: center;
    border-top: 1px solid rgba(255, 255, 255, 0.03);
    background: rgba(0, 0, 0, 0.08);
  }

  .level-select {
    flex-grow: 1;
    background: rgba(15, 20, 34, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: var(--radius-md);
    padding: 8px 12px;
    font-size: 11px;
    color: #ffffff;
    cursor: pointer;
    font-family: var(--font-sans);
    font-weight: 600;
    outline: none;
    transition: border-color 0.2s;
  }

  .level-select:focus {
    border-color: #00E5FF;
  }

  .reset-btn {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: var(--radius-md);
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: hsl(var(--text-muted));
    cursor: pointer;
    transition: all 0.2s;
  }

  .reset-btn:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.12);
  }

  /* Help Overlay (Internal slide panel) */
  .help-panel {
    position: absolute;
    inset: 60px 15px 15px;
    background: rgba(8, 12, 22, 0.95);
    border: 1px solid rgba(0, 229, 255, 0.15);
    border-radius: 20px;
    z-index: 50;
    display: flex;
    flex-direction: column;
    padding: 20px;
    animation: scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .help-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .help-title {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
    color: #ffffff;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .close-help-btn {
    background: transparent;
    border: none;
    color: hsl(var(--text-muted));
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: 50%;
    transition: all 0.2s;
  }

  .close-help-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #ffffff;
  }

  .help-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
  }

  .instruction-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .step-badge {
    background: rgba(0, 229, 255, 0.08);
    border: 1px solid rgba(0, 229, 255, 0.2);
    color: #00E5FF;
    border-radius: 6px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .instruction-item p {
    font-size: 12px;
    line-height: 1.45;
    color: hsl(var(--text-normal));
    margin: 0;
  }

  .text-pink {
    color: #FF3366;
    font-weight: 600;
  }

  .text-cyan {
    color: #00E5FF;
    font-weight: 600;
  }

  /* Victory Modal Backdrop */
  .win-modal-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(3, 7, 18, 0.85);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
    padding: 20px;
    animation: fadeIn 0.25s ease-out;
  }

  .win-modal {
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid rgba(0, 229, 255, 0.2);
    border-radius: 28px;
    padding: 30px 20px;
    width: 100%;
    max-width: 340px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5),
                0 0 60px rgba(0, 229, 255, 0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 14px;
    animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .win-icon-wrapper {
    background: rgba(0, 229, 255, 0.08);
    border: 1px solid rgba(0, 229, 255, 0.25);
    border-radius: 50%;
    width: 72px;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: pulse-glow 2s infinite ease-in-out;
  }

  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 10px rgba(0, 229, 255, 0.1);
      transform: scale(1);
    }
    50% {
      box-shadow: 0 0 25px rgba(0, 229, 255, 0.3);
      transform: scale(1.04);
    }
  }

  .win-title {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 900;
    color: #ffffff;
    letter-spacing: 0.06em;
    margin: 0;
    text-shadow: 0 0 12px rgba(0, 229, 255, 0.2);
  }

  .win-subtitle {
    font-size: 12px;
    color: hsl(var(--text-muted));
    margin: -6px 0 0 0;
  }

  /* Victory stats */
  .win-stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    width: 100%;
    margin: 6px 0;
  }

  .win-stat-item {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 12px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .win-stat-label {
    font-size: 9px;
    color: hsl(var(--text-muted));
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 700;
  }

  .win-stat-val {
    font-family: var(--font-mono);
    font-size: 16px;
    font-weight: 700;
    color: #ffffff;
  }

  /* Victory buttons */
  .win-actions {
    display: flex;
    gap: 10px;
    width: 100%;
    margin-top: 6px;
  }

  .modal-btn {
    padding: 10px 16px;
    border-radius: 10px;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
  }

  .modal-btn.primary {
    background: linear-gradient(135deg, #00E5FF 0%, #0088FF 100%);
    border: none;
    color: #030712;
    box-shadow: 0 4px 12px rgba(0, 229, 255, 0.25);
  }

  .modal-btn.primary:hover {
    transform: translateY(-1.5px);
    box-shadow: 0 6px 16px rgba(0, 229, 255, 0.4);
  }

  .modal-btn.secondary {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    color: #ffffff;
  }

  .modal-btn.secondary:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .completion-badge {
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.2);
    color: #10b981;
    font-size: 12px;
    font-weight: 700;
    padding: 8px 16px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.1);
  }

  /* Animations definitions */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleUp {
    from { transform: scale(0.92); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  /* Solution Footer & Solve Button */
  .help-solution-footer {
    margin-top: auto;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
    text-align: center;
  }

  .solution-text {
    font-size: 11px;
    color: hsl(var(--text-muted));
    line-height: 1.4;
    margin: 0;
  }

  .solve-btn {
    width: 100%;
    background: linear-gradient(135deg, rgba(0, 229, 255, 0.2) 0%, rgba(0, 136, 255, 0.2) 100%);
    border: 1px solid rgba(0, 229, 255, 0.3);
    border-radius: 10px;
    color: #ffffff;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 12px;
    padding: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 0 15px rgba(0, 229, 255, 0.05);
  }

  .solve-btn:hover {
    background: linear-gradient(135deg, rgba(0, 229, 255, 0.35) 0%, rgba(0, 136, 255, 0.35) 100%);
    border-color: rgba(0, 229, 255, 0.5);
    box-shadow: 0 0 20px rgba(0, 229, 255, 0.15);
    transform: translateY(-1px);
  }

  .solve-btn:active {
    transform: translateY(0);
  }
</style>
