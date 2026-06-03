<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    nodes, 
    connections, 
    zoom, 
    panX, 
    panY, 
    selectedNodeId, 
    draggingConnection,
    updateDraggingConnection,
    cancelDraggingConnection,
    deleteConnection
  } from '../store';
  import NodeCard from './NodeCard.svelte';
  import { Trash2 } from '@lucide/svelte';

  let canvasEl: HTMLElement;
  let isPanning = $state(false);
  let startPanX = 0;
  let startPanY = 0;
  
  // Array of calculated coordinates for all connections
  interface ConnectionCoords {
    id: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    isPulsing?: boolean;
  }
  
  let wireCoordsList = $state<ConnectionCoords[]>([]);

  // Update wire coordinates by querying DOM elements of port dots
  function updateWireCoords() {
    const canvasViewport = document.querySelector('.canvas-viewport') as HTMLElement;
    if (!canvasViewport) return;
    const canvasRect = canvasViewport.getBoundingClientRect();

    wireCoordsList = $connections.map((conn) => {
      const fromEl = document.getElementById(`port-dot-${conn.fromNodeId}-${conn.fromPortId}`);
      const toEl = document.getElementById(`port-dot-${conn.toNodeId}-${conn.toPortId}`);
      
      if (!fromEl || !toEl) {
        return { id: conn.id, fromX: 0, fromY: 0, toX: 0, toY: 0 };
      }

      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      return {
        id: conn.id,
        fromX: (fromRect.left + fromRect.width / 2 - canvasRect.left) / $zoom,
        fromY: (fromRect.top + fromRect.height / 2 - canvasRect.top) / $zoom,
        toX: (toRect.left + toRect.width / 2 - canvasRect.left) / $zoom,
        toY: (toRect.top + toRect.height / 2 - canvasRect.top) / $zoom,
        isPulsing: conn.isPulsing
      };
    });
  }

  // Svelte 5 rune to run whenever nodes or connections change
  $effect(() => {
    // Depend on nodes and connections arrays to rerun coordinate calculations
    $nodes;
    $connections;
    $zoom;
    $panX;
    $panY;
    
    // Defer slightly to allow Svelte to complete DOM layouts before querying rects
    setTimeout(updateWireCoords, 0);
  });

  onMount(() => {
    updateWireCoords();
    window.addEventListener('resize', updateWireCoords);
    return () => window.removeEventListener('resize', updateWireCoords);
  });

  // Zoom implementation
  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomFactor = 0.05;
    let nextZoom = $zoom + (e.deltaY < 0 ? zoomFactor : -zoomFactor);
    // Keep zoom between 0.3x and 2x
    nextZoom = Math.max(0.3, Math.min(2, nextZoom));
    zoom.set(nextZoom);
  }

  // Pan implementation
  function handlePointerDown(e: PointerEvent) {
    // Only pan if clicking canvas background
    if ((e.target as HTMLElement).closest('.node-card')) return;
    
    isPanning = true;
    startPanX = e.clientX - $panX;
    startPanY = e.clientY - $panY;
    canvasEl.style.cursor = 'grabbing';
    
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isPanning) return;
    panX.set(e.clientX - startPanX);
    panY.set(e.clientY - startPanY);
    
    // Update active connection dragging if it is active
    if ($draggingConnection) {
      updateDraggingCoords(e);
    }
  }

  function handlePointerUp() {
    isPanning = false;
    if (canvasEl) canvasEl.style.cursor = 'grab';
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }

  // Active connection drawing (dragging a wire to the pointer)
  function handleCanvasPointerMove(e: PointerEvent) {
    if ($draggingConnection) {
      updateDraggingCoords(e);
    }
  }

  function updateDraggingCoords(e: PointerEvent) {
    const canvasViewport = document.querySelector('.canvas-viewport') as HTMLElement;
    if (!canvasViewport) return;
    const rect = canvasViewport.getBoundingClientRect();
    
    // Translate client mouse location to canvas coordinates
    const currentX = (e.clientX - rect.left) / $zoom;
    const currentY = (e.clientY - rect.top) / $zoom;
    
    updateDraggingConnection(currentX, currentY);
  }

  function handleCanvasPointerUp() {
    if ($draggingConnection) {
      cancelDraggingConnection();
    }
  }

  // Calculate Bezier path data
  function getBezierPath(x1: number, y1: number, x2: number, y2: number): string {
    const controlOffset = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={canvasEl}
  class="canvas-container"
  onpointerdown={handlePointerDown}
  onpointermove={handleCanvasPointerMove}
  onpointerup={handleCanvasPointerUp}
  onwheel={handleWheel}
  style="cursor: grab;"
>
  <!-- Infinite Grid Background -->
  <div 
    class="canvas-grid" 
    style="
      transform: translate({$panX}px, {$panY}px) scale({$zoom});
    "
  ></div>

  <!-- Zoom & Viewport Wrapper -->
  <div
    class="canvas-viewport"
    style="
      transform: translate({$panX}px, {$panY}px) scale({$zoom});
    "
  >
    <!-- SVG Wires Layer -->
    <svg class="wires-layer">
      <!-- Gradient for execution pulse animations -->
      <defs>
        <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="rgba(141, 87, 235, 0)" />
          <stop offset="50%" stop-color="#00E5FF" />
          <stop offset="100%" stop-color="rgba(141, 87, 235, 0)" />
        </linearGradient>
      </defs>

      <!-- Draw connections -->
      {#each wireCoordsList as wire}
        {#if wire.fromX !== 0 && wire.toX !== 0}
          <!-- Background clickable wire -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <path
            d={getBezierPath(wire.fromX, wire.fromY, wire.toX, wire.toY)}
            class="connection-wire"
            stroke-width="5"
            ondblclick={() => deleteConnection(wire.id)}
          />
          <!-- Foreground wire -->
          <path
            d={getBezierPath(wire.fromX, wire.fromY, wire.toX, wire.toY)}
            class="connection-wire-visible"
            stroke-width="2.5"
            stroke="rgba(255, 255, 255, 0.2)"
            fill="none"
          />
          
          <!-- Pulsing simulation flow gradient -->
          {#if wire.isPulsing}
            <path
              d={getBezierPath(wire.fromX, wire.fromY, wire.toX, wire.toY)}
              class="connection-pulse"
              stroke-width="4.5"
            />
          {/if}
        {/if}
      {/each}

      <!-- Draw active dragging connection -->
      {#if $draggingConnection}
        <path
          d={getBezierPath(
            $draggingConnection.startX,
            $draggingConnection.startY,
            $draggingConnection.currentX,
            $draggingConnection.currentY
          )}
          class="connection-wire active"
          stroke-width="2.5"
          fill="none"
        />
      {/if}
    </svg>

    <!-- Node Cards Layer -->
    {#each $nodes as node (node.id)}
      <NodeCard {node} />
    {/each}
  </div>
</div>

<style>
  .canvas-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background-color: #070a13;
  }

  .canvas-grid {
    position: absolute;
    inset: -2000px;
    background-image: 
      radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 0),
      radial-gradient(rgba(255, 255, 255, 0.035) 1.5px, transparent 0);
    background-size: 20px 20px, 100px 100px;
    transform-origin: 0 0;
    pointer-events: none;
  }

  .canvas-viewport {
    position: absolute;
    width: 0;
    height: 0;
    transform-origin: 0 0;
  }

  .wires-layer {
    position: absolute;
    overflow: visible;
    width: 1px;
    height: 1px;
    top: 0;
    left: 0;
    pointer-events: none;
  }

  .connection-wire-visible {
    pointer-events: none;
  }
</style>
