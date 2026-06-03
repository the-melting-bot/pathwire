import { writable, get } from 'svelte/store';
import type { Vertex, Edge, Level } from './types';

// Game State Stores
export const currentLevelId = writable<number>(1);
export const gameWon = writable<boolean>(false);
export const moves = writable<number>(0);
export const timeElapsed = writable<number>(0); // in seconds
export const isRunning = writable<boolean>(false); // timer active

export const vertices = writable<Vertex[]>([]);
export const edges = writable<Edge[]>([]);

// Timer interval reference
let timerInterval: any = null;

// ---------------------------------------------------------
// Levels Database
// ---------------------------------------------------------
export const levels: Level[] = [
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
      { id: "e16", from: "v0", to: "v7" }
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
  if (!hasIntersections && updatedEdges.length > 0 && !get(gameWon)) {
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

  // Scramble/jitter vertex coordinates slightly so it is always a puzzle
  const scrambledVertices = clonedVertices.map((v: Vertex, idx: number) => {
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
  moves.set(0);
  timeElapsed.set(0);

  checkIntersections();
  startTimer();
}

export function resetLevel() {
  loadLevel(get(currentLevelId));
}

const levelSolutions: Record<number, Vertex[]> = {
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
    { id: "v5", x: 250, y: 150 },
    { id: "v6", x: 250, y: 250 },
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
    { id: "v0", x: 350, y: 162 },
    { id: "v1", x: 291, y: 350 },
    { id: "v2", x: 81, y: 350 },
    { id: "v3", x: 88, y: 142 },
    { id: "v4", x: 281, y: 50 },
    { id: "v5", x: 306, y: 183 },
    { id: "v6", x: 252, y: 274 },
    { id: "v7", x: 108, y: 277 },
    { id: "v8", x: 128, y: 165 },
    { id: "v9", x: 208, y: 111 }
  ]
};

export function solveCurrentLevel() {
  const levelId = get(currentLevelId);
  const solutionCoords = levelSolutions[levelId];
  if (!solutionCoords) return;

  // Set the vertices to their solved coordinates
  vertices.set(JSON.parse(JSON.stringify(solutionCoords)));
  
  // Recalculate intersections and victory check
  checkIntersections();
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
