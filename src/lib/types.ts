export interface Vertex {
  id: string;
  x: number;
  y: number;
}

export interface Edge {
  id: string;
  from: string; // Vertex ID
  to: string;   // Vertex ID
  isIntersecting?: boolean; // Set dynamically during calculation
}

export interface Level {
  id: number;
  name: string;
  description: string;
  vertices: Vertex[];
  edges: Edge[];
}
