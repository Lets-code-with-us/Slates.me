
import { Node } from "@/types";
import { CanvasNode } from "./CanvasNode";
import { supabase } from "@/integrations/supabase/client";

interface NodeListProps {
  nodes: Node[];
  scale: number;
}

export const NodeList = ({ nodes, scale }: NodeListProps) => {
  const handleNodeUpdate = async (nodeId: string, position: { x: number; y: number }, dimensions?: { width: number; height: number }) => {
    try {
      // Create updates object with position
      const updates: any = { position };
      
      // Add dimensions if provided
      if (dimensions) {
        updates.dimensions = dimensions;
      }

      // Update node in database
      await supabase
        .from('nodes')
        .update(updates)
        .eq('id', nodeId);
    } catch (error) {
      console.error('Error updating node:', error);
    }
  };

  return (
    <>
      {nodes.map((node) => (
        <CanvasNode 
          key={node.id} 
          node={node} 
          scale={scale}
          onUpdate={handleNodeUpdate}
        />
      ))}
    </>
  );
};
