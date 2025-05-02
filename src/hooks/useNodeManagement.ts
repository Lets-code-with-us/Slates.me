
import { useCallback } from 'react';
import { NodeData, Node } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface UseNodeManagementProps {
  canvasId: string;
  containerRef: React.RefObject<HTMLDivElement>;
  scale: number;
  animateToPosition: (position: { x: number; y: number }) => void;
}

export const useNodeManagement = ({ 
  canvasId, 
  containerRef,
  scale,
  animateToPosition
}: UseNodeManagementProps) => {
  const handleAddNode = useCallback(async (nodeData: NodeData) => {
    try {
      if (!canvasId) {
        throw new Error('No active canvas');
      }

      // Ensure all required fields are present
      const nodeForInsert = {
        canvas_id: canvasId,
        node_type: nodeData.node_type,
        content: nodeData.content || null,
        position: JSON.stringify(nodeData.position),
        dimensions: JSON.stringify(nodeData.dimensions),
        file_path: nodeData.file_path || null,
        file_name: nodeData.file_name || null,
        file_type: nodeData.file_type || null,
        style: nodeData.style ? JSON.stringify(nodeData.style) : null
      };

      const { data, error } = await supabase
        .from('nodes')
        .insert(nodeForInsert)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('No data returned after node creation');
      }

      // Navigate to the newly created node
      const position = typeof nodeData.position === 'string' 
        ? JSON.parse(nodeData.position) 
        : nodeData.position;

      const dimensions = typeof nodeData.dimensions === 'string'
        ? JSON.parse(nodeData.dimensions)
        : nodeData.dimensions;

      // Calculate target position to center the node in the viewport
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const targetX = -(position.x * scale) + (width / 2) - (dimensions.width * scale / 2);
        const targetY = -(position.y * scale) + (height / 2) - (dimensions.height * scale / 2);
        
        // Animate to the new node's position
        animateToPosition({ x: targetX, y: targetY });
      }

      return data;
    } catch (error) {
      import('@/lib/error-handler').then(({ handleError }) => {
        handleError(error, {
          title: "Node Creation Failed",
          message: `Could not create ${nodeData.node_type} node. Please try again.`,
          action: "Check your connection and refresh the page if the problem persists"
        });
      });
      return null;
    }
  }, [canvasId, containerRef, scale, animateToPosition]);

  return {
    handleAddNode
  };
};
