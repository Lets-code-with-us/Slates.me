
import { Node } from "@/types";
import { CanvasNode } from "./CanvasNode";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect } from "react";

// Type definitions for node position and dimensions
type Position = { x: number; y: number };
type Dimensions = { width: number; height: number };
type NodeUpdates = {
  position?: Position;
  dimensions?: Dimensions;
  [key: string]: any;
};

/**
 * Safely parse position object from potential string
 */
export const safeParsePosition = (position: Position | string): Position => {
  if (typeof position === 'string') {
    try {
      const parsed = JSON.parse(position);
      // Validate the parsed object has the expected shape
      if (parsed && typeof parsed === 'object' && 'x' in parsed && 'y' in parsed) {
        return { 
          x: Number(parsed.x), 
          y: Number(parsed.y) 
        };
      }
    } catch (e) {
      console.error('Error parsing position:', e);
    }
    // Return default if parsing fails
    return { x: 0, y: 0 };
  }
  return position;
};

/**
 * Safely parse dimensions object from potential string
 */
export const safeParseDimensions = (dimensions: Dimensions | string): Dimensions => {
  if (typeof dimensions === 'string') {
    try {
      const parsed = JSON.parse(dimensions);
      // Validate the parsed object has the expected shape
      if (parsed && typeof parsed === 'object' && 'width' in parsed && 'height' in parsed) {
        return { 
          width: Number(parsed.width), 
          height: Number(parsed.height) 
        };
      }
    } catch (e) {
      console.error('Error parsing dimensions:', e);
    }
    // Return minimal defaults if parsing fails
    return { width: 50, height: 50 };
  }
  return dimensions;
};

interface NodeListProps {
  nodes: Node[];
  scale: number;
  viewportBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  onNodeDoubleClick?: (node: Node) => void;
}

export const NodeList = ({ nodes, scale, viewportBounds, onNodeDoubleClick }: NodeListProps) => {
  const handleNodeUpdate = async (nodeId: string, position: Position, dimensions?: Dimensions) => {
    try {
      // Create updates object with position
      const updates: NodeUpdates = { position };
      
      // Add dimensions if provided
      if (dimensions) {
        updates.dimensions = dimensions;
      }

      // Update node in database
      const { error } = await supabase
        .from('nodes')
        .update(updates)
        .eq('id', nodeId);

      if (error) {
        throw error;
      }
    } catch (error) {
      // Use our new standardized error handling
      import('@/lib/error-handler').then(({ handleError }) => {
        handleError(error, {
          title: "Node Update Failed",
          message: "Unable to update node position or size"
        });
      });
    }
  };

  // Filter nodes to only render those in or near the viewport for better performance
  const visibleNodes = nodes.filter(node => {
    const nodePos = typeof node.position === 'string' 
      ? JSON.parse(node.position) 
      : node.position;
    
    const nodeDim = typeof node.dimensions === 'string'
      ? JSON.parse(node.dimensions)
      : node.dimensions;
    
    // Calculate padding around viewport (as a factor of viewport size)
    const paddingX = viewportBounds.width * 0.5;
    const paddingY = viewportBounds.height * 0.5;
    
    // Check if node is within expanded viewport bounds
    return (
      nodePos.x < viewportBounds.x + viewportBounds.width + paddingX &&
      nodePos.x + nodeDim.width > viewportBounds.x - paddingX &&
      nodePos.y < viewportBounds.y + viewportBounds.height + paddingY &&
      nodePos.y + nodeDim.height > viewportBounds.y - paddingY
    );
  });

  // For debugging: log the difference in rendered nodes
  useEffect(() => {
    if (nodes.length > 100) {
      console.debug(`Virtualization: Rendering ${visibleNodes.length} of ${nodes.length} nodes (${Math.round((visibleNodes.length/nodes.length)*100)}%)`);
    }
  }, [visibleNodes.length, nodes.length]);

  return (
    <>
      {visibleNodes.map((node) => (
        <CanvasNode 
          key={node.id} 
          node={node} 
          scale={scale}
          onUpdate={handleNodeUpdate}
          onDoubleClick={onNodeDoubleClick}
        />
      ))}
    </>
  );
};
