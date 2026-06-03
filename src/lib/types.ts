export type PortType = 'text' | 'any';

export interface Port {
  id: string;
  name: string;
  type: PortType;
}

export type NodeType = 'input' | 'scrubber' | 'prompt' | 'output';

export interface Node {
  id: string;
  type: NodeType;
  name: string;
  x: number;
  y: number;
  inputs: Port[];
  outputs: Port[];
  // Dynamic execution state
  status: 'idle' | 'running' | 'success' | 'error';
  errorMessage?: string;
  // Node parameters and run values
  params: Record<string, any>;
  inputValues: Record<string, string>;
  outputValues: Record<string, string>;
}

export interface Connection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
  // Visual pulsing when active
  isPulsing?: boolean;
}
