import { writable, get } from 'svelte/store';
import type { Vertex, Edge, Level } from './types';

// Game State Stores
export const currentLevelId = writable<number>(0); // Start at Level 0 Tutorial!
export const gameWon = writable<boolean>(false);
export const showVictoryScreen = writable<boolean>(false);
export const isReplaying = writable<boolean>(false);
export const moveHistory = writable<Vertex[][]>([]);
export const moves = writable<number>(0);
export const timeElapsed = writable<number>(0); // in seconds
export const isRunning = writable<boolean>(false); // timer active
export const isAnimatingSolve = writable<boolean>(false);

export const vertices = writable<Vertex[]>([]);
export const edges = writable<Edge[]>([]);

// Timer interval reference
let timerInterval: any = null;

// ---------------------------------------------------------
// Levels Database
// ---------------------------------------------------------
export const levels: Level[] = [
  {
    id: 0,
    name: "Calibration Tutorial",
    description: "Welcome to Linetrick! Drag the flashing node to the highlighted target to untangle the wires.",
    vertices: [
      { id: "v1", x: 100, y: 200 },
      { id: "v2", x: 220, y: 200 },
      { id: "v3", x: 160, y: 300 },
      { id: "v4", x: 160, y: 120 } // Tangled node in middle
    ],
    edges: [
      { id: "e1", from: "v1", to: "v2" }, // horizontal
      { id: "e2", from: "v3", to: "v4" }, // vertical, crossing e1!
      { id: "e3", from: "v1", to: "v3" },
      { id: "e4", from: "v2", to: "v3" }
    ]
  },
  {
    id: 1,
    name: "The Crossroad",
    description: "Drag the vertices to untangle the square. When no lines cross, they will turn glowing cyan.",
    vertices: [
      { id: "v1", x: 100, y: 100 },
      { id: "v2", x: 300, y: 100 },
      { id: "v3", x: 100, y: 300 },
      { id: "v4", x: 300, y: 300 }
    ],
    edges: [
      { id: "e1", from: "v1", to: "v4" }, // Crossed diagonal
      { id: "e2", from: "v2", to: "v3" }, // Crossed diagonal
      { id: "e3", from: "v1", to: "v2" },
      { id: "e4", from: "v3", to: "v4" },
      { id: "e5", from: "v1", to: "v3" },
      { id: "e6", from: "v2", to: "v4" }
    ]
  },
  {
    id: 2,
    name: "Nebula Star",
    description: "This 5-point star is tangled. Rearrange the vertices into a circle to untangle all crossing paths.",
    vertices: [
      { id: "v0", x: 200, y: 80 },
      { id: "v1", x: 310, y: 160 },
      { id: "v2", x: 270, y: 290 },
      { id: "v3", x: 130, y: 290 },
      { id: "v4", x: 90, y: 160 }
    ],
    edges: [
      { id: "e1", from: "v0", to: "v2" },
      { id: "e2", from: "v2", to: "v4" },
      { id: "e3", from: "v4", to: "v1" },
      { id: "e4", from: "v1", to: "v3" },
      { id: "e5", from: "v3", to: "v0" },
      // Outer ring
      { id: "e6", from: "v0", to: "v1" },
      { id: "e7", from: "v1", to: "v2" },
      { id: "e8", from: "v3", to: "v4" }
    ]
  },
  {
    id: 3,
    name: "The Hypercube",
    description: "A 3D cube projection can be drawn flat. Place the inner square neatly inside the outer square.",
    vertices: [
      // Outer square
      { id: "v0", x: 70, y: 70 },
      { id: "v1", x: 330, y: 70 },
      { id: "v2", x: 330, y: 330 },
      { id: "v3", x: 70, y: 330 },
      // Inner square (scrambled/crossed)
      { id: "v4", x: 240, y: 130 },
      { id: "v5", x: 140, y: 230 },
      { id: "v6", x: 240, y: 230 },
      { id: "v7", x: 140, y: 130 }
    ],
    edges: [
      // Outer square
      { id: "e1", from: "v0", to: "v1" },
      { id: "e2", from: "v1", to: "v2" },
      { id: "e3", from: "v2", to: "v3" },
      { id: "e4", from: "v3", to: "v0" },
      // Inner square
      { id: "e5", from: "v4", to: "v5" },
      { id: "e6", from: "v5", to: "v6" },
      { id: "e7", from: "v6", to: "v7" },
      { id: "e8", from: "v7", to: "v4" },
      // Inter-connections
      { id: "e9", from: "v0", to: "v4" },
      { id: "e10", from: "v1", to: "v5" },
      { id: "e11", from: "v2", to: "v6" },
      { id: "e12", from: "v3", to: "v7" }
    ]
  },
  {
    id: 4,
    name: "Double Pyramid",
    description: "This 3D double pyramid has complex intersecting faces. Disperse the points to find the flat web.",
    vertices: [
      { id: "v0", x: 200, y: 60 },
      { id: "v1", x: 320, y: 180 },
      { id: "v2", x: 260, y: 320 },
      { id: "v3", x: 140, y: 320 },
      { id: "v4", x: 80, y: 180 },
      { id: "v5", x: 200, y: 200 }
    ],
    edges: [
      { id: "e1", from: "v0", to: "v1" },
      { id: "e2", from: "v1", to: "v2" },
      { id: "e3", from: "v2", to: "v3" },
      { id: "e4", from: "v3", to: "v4" },
      { id: "e5", from: "v4", to: "v0" },
      // Connect to center V5
      { id: "e6", from: "v0", to: "v5" },
      { id: "e7", from: "v1", to: "v5" },
      { id: "e8", from: "v2", to: "v5" },
      { id: "e9", from: "v3", to: "v5" },
      { id: "e10", from: "v4", to: "v5" }
    ]
  },
  {
    id: 5,
    name: "Quantum Lattice",
    description: "Final puzzle! 10 interconnected nodes forming a complex mesh. Solve this to complete the game.",
    vertices: [
      // Outer ring
      { id: "v0", x: 100, y: 120 },
      { id: "v1", x: 280, y: 80 },
      { id: "v2", x: 320, y: 200 },
      { id: "v3", x: 220, y: 330 },
      { id: "v4", x: 80, y: 270 },
      // Inner ring (tangled)
      { id: "v5", x: 210, y: 140 },
      { id: "v6", x: 140, y: 240 },
      { id: "v7", x: 250, y: 240 },
      { id: "v8", x: 120, y: 160 },
      { id: "v9", x: 260, y: 150 }
    ],
    edges: [
      // Outer Ring
      { id: "e1", from: "v0", to: "v1" },
      { id: "e2", from: "v1", to: "v2" },
      { id: "e3", from: "v2", to: "v3" },
      { id: "e4", from: "v3", to: "v4" },
      { id: "e5", from: "v4", to: "v0" },
      // Inner Ring
      { id: "e6", from: "v5", to: "v6" },
      { id: "e7", from: "v6", to: "v7" },
      { id: "e8", from: "v7", to: "v8" },
      { id: "e9", from: "v8", to: "v9" },
      { id: "e10", from: "v9", to: "v5" },
      // Bridges
      { id: "e11", from: "v0", to: "v5" },
      { id: "e12", from: "v1", to: "v6" },
      { id: "e13", from: "v2", to: "v7" },
      { id: "e14", from: "v3", to: "v8" },
      { id: "e15", from: "v4", to: "v9" },
      // Cross-cuts to make it harder
      { id: "e16", from: "v0", to: "v6" }
    ]
  }
];

// ---------------------------------------------------------
// 2D Line Segment Intersection Logic
// ---------------------------------------------------------
function checkLineIntersection(
  p1: Vertex,
  p2: Vertex,
  p3: Vertex,
  p4: Vertex
): boolean {
  // If they share a vertex, they do not cross in the mathematical game sense
  if (
    p1.id === p3.id ||
    p1.id === p4.id ||
    p2.id === p3.id ||
    p2.id === p4.id
  ) {
    return false;
  }

  const det = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (det === 0) return false; // Parallel or collinear

  const u = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / det;
  const v = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / det;

  // u and v must be strictly between 0 and 1 for an intersection inside segments
  return u > 0 && u < 1 && v > 0 && v < 1;
}

export function checkIntersections() {
  const currentVertices = get(vertices);
  const currentEdges = get(edges);
  const vertexMap = new Map(currentVertices.map((v) => [v.id, v]));

  // Reset intersection status
  const updatedEdges = currentEdges.map((e) => ({ ...e, isIntersecting: false }));

  // Run O(E^2) intersection sweeps
  for (let i = 0; i < updatedEdges.length; i++) {
    for (let j = i + 1; j < updatedEdges.length; j++) {
      const e1 = updatedEdges[i];
      const e2 = updatedEdges[j];

      const p1 = vertexMap.get(e1.from);
      const p2 = vertexMap.get(e1.to);
      const p3 = vertexMap.get(e2.from);
      const p4 = vertexMap.get(e2.to);

      if (p1 && p2 && p3 && p4) {
        if (checkLineIntersection(p1, p2, p3, p4)) {
          e1.isIntersecting = true;
          e2.isIntersecting = true;
        }
      }
    }
  }

  edges.set(updatedEdges);

  // Victory check: zero intersecting lines
  const hasIntersections = updatedEdges.some((e) => e.isIntersecting);
  if (!hasIntersections && updatedEdges.length > 0 && !get(gameWon) && !get(isAnimatingSolve) && !get(isReplaying)) {
    gameWon.set(true);
    stopTimer();
  }
}

// ---------------------------------------------------------
// Game State Manager Functions
// ---------------------------------------------------------
export function loadLevel(levelId: number) {
  const level = levels.find((l) => l.id === levelId);
  if (!level) return;

  // Deep clone level nodes & connections to ensure fresh load
  const clonedVertices = JSON.parse(JSON.stringify(level.vertices));
  const clonedEdges = JSON.parse(JSON.stringify(level.edges));

  // Scramble/jitter vertex coordinates slightly so it is always a puzzle (except Level 0)
  const scrambledVertices = levelId === 0 ? clonedVertices : clonedVertices.map((v: Vertex, idx: number) => {
    // Offset slightly by level/index based math so the user always has a puzzle to solve
    const angle = (idx * 2 * Math.PI) / clonedVertices.length + levelId;
    const radius = 100 + (idx % 2) * 30;
    return {
      ...v,
      x: 200 + Math.cos(angle) * radius,
      y: 200 + Math.sin(angle) * radius
    };
  });

  vertices.set(scrambledVertices);
  edges.set(clonedEdges);
  currentLevelId.set(levelId);
  gameWon.set(false);
  showVictoryScreen.set(false);
  isReplaying.set(false);
  
  // Record initial snapshot
  const initialClone = JSON.parse(JSON.stringify(scrambledVertices)) as Vertex[];
  moveHistory.set([initialClone]);
  
  moves.set(0);
  timeElapsed.set(0);

  checkIntersections();
  startTimer();
}

export function resetLevel() {
  loadLevel(get(currentLevelId));
}

const levelSolutions: Record<number, Vertex[]> = {
  0: [
    { id: "v1", x: 100, y: 200 },
    { id: "v2", x: 220, y: 200 },
    { id: "v3", x: 160, y: 300 },
    { id: "v4", x: 300, y: 120 }
  ],
  1: [
    { id: "v1", x: 100, y: 100 },
    { id: "v2", x: 300, y: 100 },
    { id: "v3", x: 100, y: 300 },
    { id: "v4", x: 180, y: 180 }
  ],
  2: [
    { id: "v0", x: 100, y: 100 },
    { id: "v1", x: 200, y: 200 },
    { id: "v2", x: 300, y: 100 },
    { id: "v3", x: 100, y: 300 },
    { id: "v4", x: 300, y: 300 }
  ],
  3: [
    { id: "v0", x: 70, y: 70 },
    { id: "v1", x: 330, y: 70 },
    { id: "v2", x: 330, y: 330 },
    { id: "v3", x: 70, y: 330 },
    { id: "v4", x: 150, y: 150 },
    { id: "v5", x: 255, y: 150 },
    { id: "v6", x: 255, y: 250 },
    { id: "v7", x: 150, y: 250 }
  ],
  4: [
    { id: "v0", x: 200, y: 70 },
    { id: "v1", x: 324, y: 160 },
    { id: "v2", x: 276, y: 305 },
    { id: "v3", x: 124, y: 305 },
    { id: "v4", x: 76, y: 160 },
    { id: "v5", x: 200, y: 200 }
  ],
  5: [
    { id: "v0", x: 340, y: 200 },
    { id: "v1", x: 243, y: 67 },
    { id: "v2", x: 87, y: 118 },
    { id: "v3", x: 87, y: 282 },
    { id: "v4", x: 243, y: 333 },
    { id: "v5", x: 274, y: 207 },
    { id: "v6", x: 256, y: 162 },
    { id: "v7", x: 168, y: 172 },
    { id: "v8", x: 160, y: 238 },
    { id: "v9", x: 226, y: 259 }
  ]
};

export function solveCurrentLevel() {
  if (get(isAnimatingSolve)) return;

  const levelId = get(currentLevelId);
  const solutionCoords = levelSolutions[levelId];
  if (!solutionCoords) return;

  // Stop the timer so the user's solve time is locked when they hit solve
  stopTimer();
  isAnimatingSolve.set(true);

  const startVertices = get(vertices);
  const targetVertices = JSON.parse(JSON.stringify(solutionCoords)) as Vertex[];

  const duration = 2000; // 2 seconds animation
  const startTime = performance.now();

  function animate(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function: easeInOutCubic
    const ease = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    // Interpolate vertices
    const currentVertices = startVertices.map(startV => {
      const targetV = targetVertices.find(v => v.id === startV.id);
      if (!targetV) return startV;
      return {
        id: startV.id,
        x: startV.x + (targetV.x - startV.x) * ease,
        y: startV.y + (targetV.y - startV.y) * ease
      };
    });

    vertices.set(currentVertices);
    checkIntersections(); // Recalculate crossings so lines change color dynamically!

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      isAnimatingSolve.set(false);
      // Now trigger victory check
      checkIntersections();
    }
  }

  requestAnimationFrame(animate);
}

// ---------------------------------------------------------
// Timer Management
// ---------------------------------------------------------
export function startTimer() {
  stopTimer();
  isRunning.set(true);
  timerInterval = setInterval(() => {
    timeElapsed.update((t) => t + 1);
  }, 1000);
}

export function stopTimer() {
  isRunning.set(false);
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ---------------------------------------------------------
// Replay Recording & Playback Functions
// ---------------------------------------------------------
export function recordSnapshot() {
  if (get(isReplaying) || get(isAnimatingSolve)) return;
  const currentVertices = get(vertices);
  const history = get(moveHistory);

  if (history.length > 0) {
    const last = history[history.length - 1];
    let changed = false;
    for (let i = 0; i < currentVertices.length; i++) {
      const vCurr = currentVertices[i];
      const vLast = last.find(v => v.id === vCurr.id);
      if (!vLast || Math.abs(vCurr.x - vLast.x) > 0.5 || Math.abs(vCurr.y - vLast.y) > 0.5) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
  }

  const clone = JSON.parse(JSON.stringify(currentVertices)) as Vertex[];
  moveHistory.update(h => [...h, clone]);
}

export function runSolveReplay(onComplete: () => void) {
  if (get(isReplaying)) return;

  const history = get(moveHistory);
  if (history.length < 2) {
    onComplete();
    return;
  }

  stopTimer();
  isReplaying.set(true);

  // We want the replay to take around 2.0 to 2.5 seconds
  const targetDuration = 2000; // 2 seconds
  const frameRate = 60;
  const totalTargetFrames = (targetDuration / 1000) * frameRate; // 120 frames

  const totalHistoryFrames = history.length;
  const stepIncrement = Math.max(1, Math.ceil(totalHistoryFrames / totalTargetFrames));

  let currentFrameIdx = 0;

  function playNextFrame() {
    if (currentFrameIdx >= totalHistoryFrames) {
      // Set to final solved state
      vertices.set(history[totalHistoryFrames - 1]);
      checkIntersections();

      setTimeout(() => {
        isReplaying.set(false);
        onComplete();
      }, 300); // Brief pause at the end for user satisfaction
      return;
    }

    vertices.set(history[currentFrameIdx]);
    checkIntersections();

    currentFrameIdx += stepIncrement;
    requestAnimationFrame(playNextFrame);
  }

  requestAnimationFrame(playNextFrame);
}
