import { writable, get } from 'svelte/store';
import type { Node, Connection, NodeType } from './types';

// Canvas Zoom & Pan
export const zoom = writable<number>(1);
export const panX = writable<number>(0);
export const panY = writable<number>(0);

// Node Editor Data
export const nodes = writable<Node[]>([]);
export const connections = writable<Connection[]>([]);
export const selectedNodeId = writable<string | null>(null);

// Connection Drag State
export interface DraggingConnection {
  fromNodeId: string;
  fromPortId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}
export const draggingConnection = writable<DraggingConnection | null>(null);

// Simulation/Execution State
export const isRunning = writable<boolean>(false);

// Unique ID helper
function uuid(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ---------------------------------------------------------
// Node Templates & Management
// ---------------------------------------------------------
export function addNode(type: NodeType, x: number, y: number) {
  const id = `node-${uuid()}`;
  let newNode: Node;

  switch (type) {
    case 'input':
      newNode = {
        id,
        type,
        name: 'Source Text',
        x,
        y,
        inputs: [],
        outputs: [{ id: 'out', name: 'text', type: 'text' }],
        status: 'idle',
        params: { text: 'Welcome to Pathwire.ai - Connect nodes and run logic!' },
        inputValues: {},
        outputValues: {}
      };
      break;

    case 'scrubber':
      newNode = {
        id,
        type,
        name: 'Text Scrubber',
        x,
        y,
        inputs: [{ id: 'in', name: 'text', type: 'text' }],
        outputs: [{ id: 'out', name: 'clean text', type: 'text' }],
        status: 'idle',
        params: { mode: 'clean-whitespace' }, // 'clean-whitespace' | 'uppercase' | 'strip-emojis' | 'slugify'
        inputValues: { in: '' },
        outputValues: { out: '' }
      };
      break;

    case 'prompt':
      newNode = {
        id,
        type,
        name: 'Gemini AI Prompt',
        x,
        y,
        inputs: [{ id: 'in', name: 'context', type: 'text' }],
        outputs: [{ id: 'out', name: 'response', type: 'text' }],
        status: 'idle',
        params: { prompt: 'Summarize the input text in one punchy sentence.' },
        inputValues: { in: '' },
        outputValues: { out: '' }
      };
      break;

    case 'output':
      newNode = {
        id,
        type,
        name: 'Terminal Output',
        x,
        y,
        inputs: [{ id: 'in', name: 'data', type: 'text' }],
        outputs: [],
        status: 'idle',
        params: {},
        inputValues: { in: '' },
        outputValues: {}
      };
      break;
  }

  nodes.update((prev) => [...prev, newNode]);
  selectedNodeId.set(id);
}

export function deleteNode(nodeId: string) {
  // Remove node
  nodes.update((prev) => prev.filter((n) => n.id !== nodeId));
  // Remove associated connections
  connections.update((prev) =>
    prev.filter((c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId)
  );
  if (get(selectedNodeId) === nodeId) {
    selectedNodeId.set(null);
  }
}

// ---------------------------------------------------------
// Connections Management
// ---------------------------------------------------------
export function startDraggingConnection(
  nodeId: string,
  portId: string,
  startX: number,
  startY: number
) {
  draggingConnection.set({
    fromNodeId: nodeId,
    fromPortId: portId,
    startX,
    startY,
    currentX: startX,
    currentY: startY
  });
}

export function updateDraggingConnection(currentX: number, currentY: number) {
  draggingConnection.update((state) => {
    if (!state) return null;
    return { ...state, currentX, currentY };
  });
}

export function cancelDraggingConnection() {
  draggingConnection.set(null);
}

export function completeDraggingConnection(toNodeId: string, toPortId: string) {
  const drag = get(draggingConnection);
  if (!drag) return;

  // Prevent connecting to self
  if (drag.fromNodeId === toNodeId) {
    draggingConnection.set(null);
    return;
  }

  // Remove existing connections to target input port (since input ports only take 1 input)
  connections.update((prev) =>
    prev.filter((c) => !(c.toNodeId === toNodeId && c.toPortId === toPortId))
  );

  const newConn: Connection = {
    id: `conn-${uuid()}`,
    fromNodeId: drag.fromNodeId,
    fromPortId: drag.fromPortId,
    toNodeId,
    toPortId
  };

  connections.update((prev) => [...prev, newConn]);
  draggingConnection.set(null);
}

export function deleteConnection(connId: string) {
  connections.update((prev) => prev.filter((c) => c.id !== connId));
}

// ---------------------------------------------------------
// Mock Logic Execution & Core Solver Engine
// ---------------------------------------------------------
const mockScrubbers: Record<string, (val: string) => string> = {
  'clean-whitespace': (v) => v.replace(/\s+/g, ' ').trim(),
  'uppercase': (v) => v.toUpperCase(),
  'strip-emojis': (v) => v.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, ''),
  'slugify': (v) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
};

const mockAiResponses = [
  "✨ Summary: Data successfully piped, parsed, and scrubbed through the active workspace.",
  "🚀 Insight: The execution flow has reached its terminal node with high confidence signals.",
  "🤖 Node Analyzer: Automated pipelines are running efficiently at 60fps.",
  "💡 Vision: A simple input can be transformed into complex logical outputs."
];

async function executeNode(node: Node): Promise<Record<string, string>> {
  // Update node state to running
  nodes.update((list) =>
    list.map((n) => (n.id === node.id ? { ...n, status: 'running' } : n))
  );

  // Simulate networking/AI crunch time latency
  await new Promise((resolve) => setTimeout(resolve, 800));

  try {
    const outputs: Record<string, string> = {};

    switch (node.type) {
      case 'input':
        outputs['out'] = node.params.text || '';
        break;

      case 'scrubber': {
        const inputVal = node.inputValues['in'] || '';
        const mode = node.params.mode || 'clean-whitespace';
        outputs['out'] = mockScrubbers[mode] ? mockScrubbers[mode](inputVal) : inputVal;
        break;
      }

      case 'prompt': {
        const context = node.inputValues['in'] || '';
        const prompt = node.params.prompt || '';
        const randomAi = mockAiResponses[Math.floor(Math.random() * mockAiResponses.length)];
        outputs['out'] = `[AI Processed Context: "${context.substring(0, 30)}..."]\nInstruction: "${prompt}"\n\n${randomAi}`;
        break;
      }

      case 'output':
        // Output node displays the output directly, outputs nothing downstream
        break;
    }

    nodes.update((list) =>
      list.map((n) =>
        n.id === node.id
          ? { ...n, status: 'success', outputValues: outputs }
          : n
      )
    );

    return outputs;
  } catch (err) {
    nodes.update((list) =>
      list.map((n) =>
        n.id === node.id
          ? { ...n, status: 'error', errorMessage: String(err) }
          : n
      )
    );
    throw err;
  }
}

// Depth-First Solver to flow data step by step
export async function runWorkflow() {
  if (get(isRunning)) return;
  isRunning.set(true);

  // 1. Reset all node statuses to idle
  nodes.update((list) =>
    list.map((n) => ({
      ...n,
      status: 'idle',
      inputValues: {},
      outputValues: {},
      errorMessage: undefined
    }))
  );

  const allNodes = get(nodes);
  const allConns = get(connections);

  // Helper to find downstream nodes
  const getDownstream = (nodeId: string) => {
    return allConns.filter((c) => c.fromNodeId === nodeId);
  };

  // Start with root nodes (nodes with 0 inputs)
  const roots = allNodes.filter((n) => n.inputs.length === 0);

  // Track completed nodes to prevent double execution loops
  const completed = new Set<string>();

  // Process a queue of nodes to allow parallel branches
  let queue = [...roots];

  while (queue.length > 0) {
    const currentNode = queue.shift();
    if (!currentNode) continue;

    // Check if node is ready to run (all its connected inputs have output values)
    const inputsConnected = allConns.filter((c) => c.toNodeId === currentNode.id);
    const ready = inputsConnected.every((c) => {
      const parent = get(nodes).find((n) => n.id === c.fromNodeId);
      return parent && completed.has(parent.id);
    });

    if (!ready && currentNode.inputs.length > 0) {
      // Put back at the end of queue to wait for upstream outputs
      queue.push(currentNode);
      // Failsafe to prevent infinite loops if there is a cycle (though editor disallows cycling)
      continue;
    }

    // Populate inputs from parent outputs
    const inputs: Record<string, string> = {};
    for (const conn of inputsConnected) {
      const parent = get(nodes).find((n) => n.id === conn.fromNodeId);
      if (parent && parent.outputValues[conn.fromPortId]) {
        inputs[conn.toPortId] = parent.outputValues[conn.fromPortId];
      }
    }

    nodes.update((list) =>
      list.map((n) =>
        n.id === currentNode.id ? { ...n, inputValues: inputs } : n
      )
    );

    // Execute the node
    try {
      const outputs = await executeNode(currentNode);
      completed.add(currentNode.id);

      // Pulse outgoing connections visually
      const outgoing = getDownstream(currentNode.id);
      if (outgoing.length > 0) {
        connections.update((list) =>
          list.map((c) =>
            c.fromNodeId === currentNode.id ? { ...c, isPulsing: true } : c
          )
        );

        // Wait for visual pulse propagation (600ms CSS transition duration)
        await new Promise((resolve) => setTimeout(resolve, 600));

        connections.update((list) =>
          list.map((c) =>
            c.fromNodeId === currentNode.id ? { ...c, isPulsing: false } : c
          )
        );

        // Add children to the queue
        for (const conn of outgoing) {
          const childNode = allNodes.find((n) => n.id === conn.toNodeId);
          if (childNode && !queue.some((q) => q.id === childNode.id)) {
            queue.push(childNode);
          }
        }
      }
    } catch {
      // Stop execution on error
      break;
    }
  }

  isRunning.set(false);
}
