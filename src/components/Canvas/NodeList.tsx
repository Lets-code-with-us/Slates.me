
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
      const updates: any = { position };
      if (dimensions) {
        updates.dimensions = dimensions;
      }

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
