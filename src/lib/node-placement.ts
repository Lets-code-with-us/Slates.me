import { Node, NodeData } from "@/types";

/**
 * Enhanced grid-based node placement strategy that prevents overlaps
 */

// Grid cell size (used for placement calculation)
const GRID_SIZE = 30; // Smaller grid for more precise placement

// Default padding between nodes
const NODE_PADDING = 30; // Increased padding for better separation

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
export const calculateDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}): number => {
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
 * Check if two nodes overlap
 */
const checkOverlap = (
  posA: Position, 
  dimA: { width: number; height: number },
  posB: Position,
  dimB: { width: number; height: number }
): boolean => {
  // Add padding around nodes
  const paddedPosA = {
    x: posA.x - NODE_PADDING / 2,
    y: posA.y - NODE_PADDING / 2
  };
  
  const paddedDimA = {
    width: dimA.width + NODE_PADDING,
    height: dimA.height + NODE_PADDING
  };
  
  // Check for overlap with padding
  return (
    paddedPosA.x < posB.x + dimB.width &&
    paddedPosA.x + paddedDimA.width > posB.x &&
    paddedPosA.y < posB.y + dimB.height &&
    paddedPosA.y + paddedDimA.height > posB.y
  );
};

/**
 * Find an available position for a new node
 */
export const findAvailablePosition = (
  nodes: Node[], 
  dimensions: {width: number, height: number},
  viewport: {x: number, y: number, width: number, height: number} | null
): {x: number, y: number} => {
  // If no viewport or empty canvas, place in center
  if (!nodes.length || !viewport) {
    return { x: 0, y: 0 };
  }
  
  // Try to find a cluster with available space
  const clusters = findNodeClusters(nodes);
  
  // Start with viewport center
  const startX = viewport.x + viewport.width / 2 - dimensions.width / 2;
  const startY = viewport.y + viewport.height / 2 - dimensions.height / 2;
  
  // Check for collisions with nodes
  const hasCollision = (x: number, y: number): boolean => {
    return nodes.some(node => {
      const position = typeof node.position === 'string' 
        ? JSON.parse(node.position) 
        : node.position;
      
      const nodeDimensions = typeof node.dimensions === 'string'
        ? JSON.parse(node.dimensions)
        : node.dimensions;
      
      return (
        x < position.x + nodeDimensions.width &&
        x + dimensions.width > position.x &&
        y < position.y + nodeDimensions.height &&
        y + dimensions.height > position.y
      );
    });
  };
  
  // Try viewport center first
  if (!hasCollision(startX, startY)) {
    return { x: startX, y: startY };
  }
  
  // Try spiral outward from center
  let angle = 0;
  let radius = 50;
  const radiusIncrement = 50;
  const angleIncrement = Math.PI / 4;
  
  for (let i = 0; i < 20; i++) { // Limit iterations
    angle += angleIncrement;
    if (angle >= 2 * Math.PI) {
      angle = 0;
      radius += radiusIncrement;
    }
    
    const x = startX + radius * Math.cos(angle);
    const y = startY + radius * Math.sin(angle);
    
    if (!hasCollision(x, y)) {
      return { x, y };
    }
  }
  
  // Fallback to placing relative to a cluster
  if (clusters.length > 0) {
    const targetCluster = clusters[0]; // Take first cluster
    return {
      x: targetCluster.center.x + 300,
      y: targetCluster.center.y 
    };
  }
  
  // Ultimate fallback
  return { x: startX + Math.random() * 300, y: startY + Math.random() * 300 };
};