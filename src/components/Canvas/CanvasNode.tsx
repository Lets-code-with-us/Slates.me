
import { useCallback, useRef, useState } from "react";
import { Node } from "@/types";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { NodeHeader } from "./NodeHeader";
import { NodeContent } from "./NodeContent";
import { ResizeHandle } from "./ResizeHandle";

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
      e.preventDefault();
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
    e.preventDefault();
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
      e.preventDefault();
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

  return (
    <div
      ref={nodeRef}
      className={cn(
        "absolute bg-white rounded-lg shadow-lg border border-gray-200 group overflow-hidden",
        (isDragging || isResizing) && "cursor-grabbing opacity-75"
      )}
      style={{
        transform: `translate(${currentPosition.x}px, ${currentPosition.y}px)`,
        width: currentDimensions.width,
        height: currentDimensions.height,
        transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s ease'
      }}
      onDoubleClick={handleDoubleClick}
    >
      <NodeHeader
        nodeId={node.id}
        filePath={node.file_path}
        fileName={node.file_name}
        nodeType={node.node_type}
        onDragStart={handleMouseDown}
        onDragMove={handleMouseMove}
        onDragEnd={handleMouseUp}
      />

      <div className="p-2 mt-8 w-full h-[calc(100%-32px)] overflow-auto">
        <NodeContent
          node={node}
          isEditing={isEditing}
          content={content}
          onContentChange={setContent}
          onBlur={handleBlur}
        />
      </div>

      <ResizeHandle
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeEnd={handleResizeEnd}
      />
    </div>
  );
};
