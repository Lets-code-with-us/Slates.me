import { useCallback, useRef, useState } from "react";
import { Node } from "@/types";
import { cn } from "@/lib/utils";
import { FilePreview } from "./FilePreview";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CanvasNodeProps {
  node: Node;
  scale: number;
  onUpdate: (nodeId: string, position: { x: number; y: number }, dimensions?: { width: number; height: number }) => void;
}

export const CanvasNode = ({ node, scale, onUpdate }: CanvasNodeProps) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const position = typeof node.position === 'string' ? JSON.parse(node.position) : node.position;
  const dimensions = typeof node.dimensions === 'string' ? JSON.parse(node.dimensions) : node.dimensions;
  const [currentPosition, setCurrentPosition] = useState(position);
  const [currentDimensions, setCurrentDimensions] = useState(dimensions);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(node.content || '');

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      e.stopPropagation();
      setIsDragging(true);
      setDragStart({
        x: e.clientX / scale - position.x,
        y: e.clientY / scale - position.y
      });
    }
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      e.stopPropagation();
      const newPosition = {
        x: e.clientX / scale - dragStart.x,
        y: e.clientY / scale - dragStart.y
      };
      setCurrentPosition(newPosition);
    }
  }, [isDragging, dragStart, scale]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      onUpdate(node.id, currentPosition);
      setIsDragging(false);
    }
  }, [isDragging, currentPosition, node.id, onUpdate]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      width: currentDimensions.width,
      height: currentDimensions.height,
      x: e.clientX,
      y: e.clientY
    });
  }, [currentDimensions]);

  const handleResize = useCallback((e: React.MouseEvent) => {
    if (isResizing) {
      e.stopPropagation();
      const deltaX = (e.clientX - resizeStart.x) / scale;
      const deltaY = (e.clientY - resizeStart.y) / scale;
      const newDimensions = {
        width: Math.max(200, resizeStart.width + deltaX),
        height: Math.max(100, resizeStart.height + deltaY)
      };
      setCurrentDimensions(newDimensions);
    }
  }, [isResizing, resizeStart, scale]);

  const handleResizeEnd = useCallback(() => {
    if (isResizing) {
      onUpdate(node.id, currentPosition, currentDimensions);
      setIsResizing(false);
    }
  }, [isResizing, currentPosition, currentDimensions, node.id, onUpdate]);

  const handleDoubleClick = () => {
    if (node.node_type === 'text') {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (content !== node.content) {
      supabase
        .from('nodes')
        .update({ content })
        .eq('id', node.id)
        .then(({ error }) => {
          if (error) console.error('Error updating content:', error);
        });
    }
  };

  const handleDelete = async () => {
    try {
      if (node.file_path) {
        const { error: storageError } = await supabase.storage
          .from('slate_files')
          .remove([node.file_path]);

        if (storageError) throw storageError;
      }

      const { error: dbError } = await supabase
        .from('nodes')
        .delete()
        .eq('id', node.id);

      if (dbError) throw dbError;

      toast({
        title: "Node deleted",
        description: "Successfully removed the node from canvas"
      });
    } catch (error) {
      console.error('Error deleting node:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete the node",
        variant: "destructive"
      });
    }
  };

  return (
    <div
      ref={nodeRef}
      className={cn(
        "absolute bg-card rounded-lg shadow-md border group overflow-hidden",
        (isDragging || isResizing) && "cursor-grabbing"
      )}
      style={{
        transform: `translate(${currentPosition.x}px, ${currentPosition.y}px)`,
        width: currentDimensions.width,
        height: currentDimensions.height,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => {
        handleMouseMove(e);
        handleResize(e);
      }}
      onMouseUp={() => {
        handleMouseUp();
        handleResizeEnd();
      }}
      onMouseLeave={() => {
        handleMouseUp();
        handleResizeEnd();
      }}
      onDoubleClick={handleDoubleClick}
    >
      <button
        onClick={handleDelete}
        className="absolute -top-2 -right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:scale-110"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {node.node_type === 'text' && (
        <div className="p-4 w-full h-full">
          {isEditing ? (
            <textarea
              className="w-full h-full p-2 bg-transparent resize-none focus:outline-none text-sm text-card-foreground"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleBlur}
              autoFocus
            />
          ) : (
            <div className="w-full h-full overflow-auto">
              <p className="text-sm text-card-foreground whitespace-pre-wrap">{content}</p>
            </div>
          )}
        </div>
      )}
      {(node.node_type === 'image' || node.node_type === 'video' || node.node_type === 'pdf') && (
        <FilePreview node={node} />
      )}

      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={handleResizeStart}
        style={{
          background: 'linear-gradient(135deg, transparent 50%, rgb(var(--primary)) 50%)',
        }}
      />
    </div>
  );
};
