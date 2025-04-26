import { Node, NodeData } from "@/types";

/**
 * Enhanced grid-based node placement strategy that prevents overlaps
 */

// Grid cell size for more precise placement
const GRID_SIZE = 50;

// Increased padding between nodes for better readability
const NODE_PADDING = 40;

// Spiral placement configuration
const SPIRAL_INITIAL_RADIUS = 100;
const SPIRAL_RADIUS_INCREMENT = 60;
const SPIRAL_ANGLE_INCREMENT = Math.PI / 6; // 30-degree increments

// Default placement area
const DEFAULT_AREA = {
  x: 50,
  y: 50,
  width: 1000,
  height: 800
};

// Node position interface
interface Position {
  x: number;
  y: number;
}

// Helper to safely parse position
const parsePosition = (position: any): Position => {
  if (typeof position === 'string') {
    try {
      return JSON.parse(position);
    } catch (e) {
      console.error('Error parsing position:', e);
      return { x: 0, y: 0 };
    }
  }
  return position;
};

// Helper to safely parse dimensions
const parseDimensions = (dimensions: any): { width: number; height: number } => {
  if (typeof dimensions === 'string') {
    try {
      return JSON.parse(dimensions);
    } catch (e) {
      console.error('Error parsing dimensions:', e);
      return { width: 200, height: 100 };
    }
  }
  return dimensions;
};

/**
 * Calculate distance between two points
 */
export const calculateDistance = (p1: Position, p2: Position): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

/**
 * Function to find clusters of closely positioned nodes
 */
export const findNodeClusters = (
  nodes: Node[], 
  clusterThreshold: number = 300
): Array<{nodes: Node[], center: {x: number, y: number}}> => {
  const clusters: Array<{nodes: Node[], center: {x: number, y: number}}> = [];
  const processedNodes = new Set<string>();

  // Process each node
  nodes.forEach(node => {
    if (processedNodes.has(node.id)) return;
    
    const position = typeof node.position === 'string' 
      ? JSON.parse(node.position) 
      : node.position;
    
    // Start a new cluster
    const cluster = [node];
    processedNodes.add(node.id);
    
    // Find all nodes close to this one
    nodes.forEach(otherNode => {
      if (node.id === otherNode.id || processedNodes.has(otherNode.id)) return;
      
      const otherPosition = typeof otherNode.position === 'string' 
        ? JSON.parse(otherNode.position) 
        : otherNode.position;
      
      if (calculateDistance(position, otherPosition) <= clusterThreshold) {
        cluster.push(otherNode);
        processedNodes.add(otherNode.id);
      }
    });
    
    // Calculate cluster center
    const centerX = cluster.reduce((sum, n) => {
      const pos = typeof n.position === 'string' ? JSON.parse(n.position) : n.position;
      return sum + pos.x;
    }, 0) / cluster.length;
    
    const centerY = cluster.reduce((sum, n) => {
      const pos = typeof n.position === 'string' ? JSON.parse(n.position) : n.position;
      return sum + pos.y;
    }, 0) / cluster.length;
    
    clusters.push({
      nodes: cluster,
      center: {x: centerX, y: centerY}
    });
  });
  
  return clusters;
};

/**
 * Check if two nodes overlap with padding
 */
const checkOverlap = (
  posA: Position, 
  dimA: { width: number; height: number },
  posB: Position,
  dimB: { width: number; height: number }
): boolean => {
  const paddedPosA = {
    x: posA.x - NODE_PADDING,
    y: posA.y - NODE_PADDING
  };
  
  const paddedDimA = {
    width: dimA.width + (NODE_PADDING * 2),
    height: dimA.height + (NODE_PADDING * 2)
  };
  
  return (
    paddedPosA.x < posB.x + dimB.width &&
    paddedPosA.x + paddedDimA.width > posB.x &&
    paddedPosA.y < posB.y + dimB.height &&
    paddedPosA.y + paddedDimA.height > posB.y
  );
};

/**
 * Find available position for a new node using an enhanced placement strategy
 */
export const findAvailablePosition = (
  nodes: Node[], 
  dimensions: {width: number, height: number},
  viewport: {x: number, y: number, width: number, height: number} | null
): Position => {
  // If no viewport or empty canvas, place in absolute center
  if (!nodes.length || !viewport) {
    return { x: -dimensions.width / 2, y: -dimensions.height / 2 };
  }

  // Calculate viewport center
  const centerX = viewport.x + (viewport.width / 2) - (dimensions.width / 2);
  const centerY = viewport.y + (viewport.height / 2) - (dimensions.height / 2);

  // Try exact center first
  const hasCollision = (x: number, y: number): boolean => {
    return nodes.some(node => {
      const nodePos = typeof node.position === 'string' 
        ? JSON.parse(node.position) 
        : node.position;
      const nodeDim = typeof node.dimensions === 'string'
        ? JSON.parse(node.dimensions)
        : node.dimensions;
      return checkOverlap({x, y}, dimensions, nodePos, nodeDim);
    });
  };

  // If center is available, use it
  if (!hasCollision(centerX, centerY)) {
    return { x: centerX, y: centerY };
  }

  // Try spiral pattern from center
  let angle = 0;
  let radius = SPIRAL_INITIAL_RADIUS;
  let attempts = 0;
  const maxAttempts = 50; // Prevent infinite loops

  while (attempts < maxAttempts) {
    // Calculate position on spiral
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    // Check if position is within viewport bounds with padding
    const isInViewport = (
      x >= viewport.x + NODE_PADDING &&
      x + dimensions.width <= viewport.x + viewport.width - NODE_PADDING &&
      y >= viewport.y + NODE_PADDING &&
      y + dimensions.height <= viewport.y + viewport.height - NODE_PADDING
    );

    // If position is valid and no collision, use it
    if (isInViewport && !hasCollision(x, y)) {
      return { x, y };
    }

    // Move to next spiral position
    angle += SPIRAL_ANGLE_INCREMENT;
    if (angle >= 2 * Math.PI) {
      angle = 0;
      radius += SPIRAL_RADIUS_INCREMENT;
    }

    attempts++;
  }

  // If spiral pattern fails, try grid pattern
  for (let row = 0; row < Math.ceil(viewport.height / GRID_SIZE); row++) {
    for (let col = 0; col < Math.ceil(viewport.width / GRID_SIZE); col++) {
      const x = viewport.x + (col * GRID_SIZE);
      const y = viewport.y + (row * GRID_SIZE);

      if (!hasCollision(x, y)) {
        return { x, y };
      }
    }
  }

  // Ultimate fallback: place in first quadrant with offset
  return {
    x: viewport.x + NODE_PADDING,
    y: viewport.y + NODE_PADDING
  };
};