<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let canvas: HTMLCanvasElement | null = $state(null);

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    baseVx: number;
    baseVy: number;
    size: number;
    color: string;
  }

  interface DebrisLine {
    x: number;
    y: number;
    vx: number;
    vy: number;
    length: number;
    angle: number;
    rotationSpeed: number;
    alpha: number;
    life: number;
    maxLife: number;
    color: string;
  }

  let particles: Particle[] = [];
  let debris: DebrisLine[] = [];
  let animationFrameId: number;
  let width = 0;
  let height = 0;

  // Track mouse coordinates
  const mouse = { x: 0, y: 0 };

  function resizeCanvas() {
    if (!canvas) return;
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    
    // Re-initialize particles if count changes too much
    initParticles();
  }

  function initParticles() {
    particles = [];
    const count = Math.min(Math.floor((width * height) / 18000), 75);
    
    const colors = ['#00E5FF', '#A855F7', '#3B82F6']; // cyan, purple, blue
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.2 + Math.random() * 0.4;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        baseVx: Math.cos(angle) * speed,
        baseVy: Math.sin(angle) * speed,
        size: 1 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  // Shatter force field triggered at coordinates
  function shatterAt(x: number, y: number, force: number) {
    // 1. Blast particles away
    particles.forEach(p => {
      const dx = p.x - x;
      const dy = p.y - y;
      const dist = Math.hypot(dx, dy);
      
      // Affect particles in a 250px radius
      if (dist < 280) {
        const factor = (280 - dist) / 280;
        const push = factor * force;
        
        // Add velocity vector outwards
        const angle = dist === 0 ? Math.random() * Math.PI * 2 : Math.atan2(dy, dx);
        p.vx += Math.cos(angle) * push;
        p.vy += Math.sin(angle) * push;
      }
    });

    // 2. Spawn temporary shattered debris lines
    const numDebris = 10 + Math.floor(Math.random() * 12);
    const colors = ['#00E5FF', '#A855F7'];
    for (let i = 0; i < numDebris; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      const maxLife = 30 + Math.floor(Math.random() * 40);
      debris.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: 10 + Math.random() * 25,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: -0.1 + Math.random() * 0.2,
        alpha: 1.0,
        life: maxLife,
        maxLife,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  function update() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw connections between particles (Constellation mesh)
    const maxDist = 120;
    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist < maxDist) {
          const alpha = (maxDist - dist) / maxDist * 0.18;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          
          // Gradient between particle colors
          const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
          grad.addColorStop(0, p1.color);
          grad.addColorStop(1, p2.color);
          
          ctx.strokeStyle = grad;
          ctx.globalAlpha = alpha;
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }
      }
    }

    // 2. Update and draw particles
    particles.forEach(p => {
      // Apply drag to damp explosive velocities
      p.vx = p.vx * 0.95 + p.baseVx * 0.05;
      p.vy = p.vy * 0.95 + p.baseVy * 0.05;

      p.x += p.vx;
      p.y += p.vy;

      // Wrap around bounds
      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;
      if (p.y < -20) p.y = height + 20;
      if (p.y > height + 20) p.y = -20;

      // Draw particle glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.15;
      ctx.fill();

      // Draw particle core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });

    // 3. Update and draw debris lines
    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      d.x += d.vx;
      d.y += d.vy;
      d.vx *= 0.92; // Friction
      d.vy *= 0.92;
      d.angle += d.rotationSpeed;
      d.life--;
      d.alpha = d.life / d.maxLife;

      if (d.life <= 0) {
        debris.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.angle);
      ctx.beginPath();
      ctx.moveTo(-d.length / 2, 0);
      ctx.lineTo(d.length / 2, 0);
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = d.alpha * 0.8;
      
      // Neon glow shadow for lines
      ctx.shadowBlur = 4;
      ctx.shadowColor = d.color;
      
      ctx.stroke();
      ctx.restore();
    }

    animationFrameId = requestAnimationFrame(update);
  }

  // Handle pointer movements
  function handlePointerMove(e: PointerEvent) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }

  // Handle scroll shatters
  function handleWheel(e: WheelEvent) {
    const force = Math.min(Math.abs(e.deltaY) * 0.08 + 2.0, 16.0);
    shatterAt(mouse.x, mouse.y, force);
  }

  // Handle click/tap shatters
  function handlePointerDown(e: PointerEvent) {
    // Prevent triggering background effect when clicking buttons or inside game mockup
    const target = e.target as HTMLElement;
    if (
      target.closest('.device-frame') || 
      target.closest('.help-panel') || 
      target.closest('.win-modal-backdrop') ||
      target.closest('button') || 
      target.closest('select')
    ) {
      return;
    }
    
    // Tap creates a powerful blast!
    shatterAt(e.clientX, e.clientY, 24.0);
  }

  onMount(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown);
    
    // Start animation loop
    animationFrameId = requestAnimationFrame(update);
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('pointerdown', handlePointerDown);
    }
    cancelAnimationFrame(animationFrameId);
  });
</script>

<canvas bind:this={canvas} class="interactive-bg-canvas"></canvas>

<style>
  .interactive-bg-canvas {
    position: absolute;
    inset: 0;
    width: 100vw;
    height: 100vh;
    z-index: 0;
    pointer-events: none; /* Allows pointer clicks to pass through to document listener */
  }
</style>
