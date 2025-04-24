
import { useCallback, useRef, useState } from "react";
import { Node } from "@/types";
import { cn } from "@/lib/utils";
import { FilePreview } from "./FilePreview";
import { supabase } from "@/integrations/supabase/client";

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

  const handleDoubleClick = () => {
    if (node.node_type === 'text') {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (content !== node.content) {
      // Update content in database
      supabase
        .from('nodes')
        .update({ content })
        .eq('id', node.id)
        .then(({ error }) => {
          if (error) console.error('Error updating content:', error);
        });
    }
  };

  return (
    <div
      ref={nodeRef}
      className={cn(
        "absolute bg-card rounded-lg shadow-sm border",
        isDragging && "cursor-grabbing"
      )}
      style={{
        transform: `translate(${currentPosition.x}px, ${currentPosition.y}px)`,
        width: currentDimensions.width,
        height: currentDimensions.height,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      {node.node_type === 'text' && (
        <div className="p-4">
          {isEditing ? (
            <textarea
              className="w-full h-full p-2 bg-transparent resize-none focus:outline-none text-sm text-card-foreground"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleBlur}
              autoFocus
            />
          ) : (
            <p className="text-sm text-card-foreground whitespace-pre-wrap">{content}</p>
          )}
        </div>
      )}
      {(node.node_type === 'image' || node.node_type === 'video' || node.node_type === 'pdf') && (
        <FilePreview node={node} />
      )}
    </div>
  );
};
