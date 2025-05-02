
import { useState, useCallback } from "react";
import { Node, NodeData } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useTextEditor = (canvasId: string, onNodeCreated?: (node: Node) => void) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [editorPosition, setEditorPosition] = useState({ x: 0, y: 0 });
  const [editorDimensions, setEditorDimensions] = useState({ width: 300, height: 150 });

  const startNewTextNode = useCallback((position: { x: number; y: number }) => {
    if (!canvasId) return;
    
    setEditorPosition(position);
    setEditingNode(null);
    setIsEditing(true);
  }, [canvasId]);

  const editExistingNode = useCallback((node: Node) => {
    const position = typeof node.position === 'string' 
      ? JSON.parse(node.position) 
      : node.position;
      
    const dimensions = typeof node.dimensions === 'string'
      ? JSON.parse(node.dimensions)
      : node.dimensions;

    setEditorPosition(position);
    setEditorDimensions(dimensions);
    setEditingNode(node);
    setIsEditing(true);
  }, []);

  const handleSubmit = useCallback(async (content: string) => {
    try {
      // If we're editing an existing node
      if (editingNode) {
        const { error } = await supabase
          .from('nodes')
          .update({ 
            content,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingNode.id);

        if (error) throw error;
      }
      // If we're creating a new node
      else {
        // Calculate appropriate dimensions based on content length and line breaks
        const lines = content.split('\n');
        const longestLine = lines.reduce((max, line) => Math.max(max, line.length), 0);
        const estimatedWidth = Math.max(300, Math.min(600, longestLine * 10)); // 10px per character, capped
        const estimatedHeight = Math.max(150, lines.length * 25); // 25px per line

        const nodeData: NodeData = {
          canvas_id: canvasId,
          node_type: 'text',
          content,
          position: editorPosition,
          dimensions: { width: estimatedWidth, height: estimatedHeight },
        };

        const { data: newNode, error } = await supabase
          .from('nodes')
          .insert({
            canvas_id: nodeData.canvas_id,
            node_type: nodeData.node_type,
            content: nodeData.content,
            position: JSON.stringify(nodeData.position),
            dimensions: JSON.stringify(nodeData.dimensions),
          })
          .select()
          .single();

        if (error) throw error;
        if (newNode && onNodeCreated) {
          onNodeCreated(newNode as Node);
        }
      }
    } catch (error) {
      import('@/lib/error-handler').then(({ handleError }) => {
        handleError(error, {
          title: "Text Node Error",
          message: "Unable to save text node"
        });
      });
    } finally {
      setIsEditing(false);
      setEditingNode(null);
    }
  }, [canvasId, editingNode, editorPosition, onNodeCreated]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditingNode(null);
  }, []);

  return {
    isEditing,
    editingNode,
    editorPosition,
    editorDimensions,
    startNewTextNode,
    editExistingNode,
    handleSubmit,
    handleCancel
  };
};
