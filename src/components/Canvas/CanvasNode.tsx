import React, { useCallback, useRef, useState, useEffect } from "react";
import { Node } from "@/types";
import { cn } from "@/lib/utils";
import { FilePreview } from "./FilePreview";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Move, Maximize2, ChevronsUpDown, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Type definitions for position and dimensions (same as in NodeList)
type Position = { x: number; y: number };
type Dimensions = { width: number; height: number };

/**
 * Safely parse position object from potential string
 */
const safeParsePosition = (position: Position | string): Position => {
  if (typeof position === 'string') {
    try {
      const parsed = JSON.parse(position);
      if (parsed && typeof parsed === 'object' && 'x' in parsed && 'y' in parsed) {
        return { 
          x: Number(parsed.x), 
          y: Number(parsed.y) 
        };
      }
    } catch (e) {
      console.error('Error parsing position:', e);
    }
    return { x: 0, y: 0 };
  }
  return position;
};

/**
 * Safely parse dimensions object from potential string
 */
const safeParseDimensions = (dimensions: Dimensions | string): Dimensions => {
  if (typeof dimensions === 'string') {
    try {
      const parsed = JSON.parse(dimensions);
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

interface CanvasNodeProps {
  node: Node;
  scale: number;
  onUpdate: (nodeId: string, position: Position, dimensions?: Dimensions) => void;
}

const CanvasNode = React.memo(({ node, scale, onUpdate }: CanvasNodeProps) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const position = safeParsePosition(node.position);
  const dimensions = safeParseDimensions(node.dimensions);
  const [currentPosition, setCurrentPosition] = useState(position);
  const [currentDimensions, setCurrentDimensions] = useState(dimensions);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(node.content || '');
  const [isMaximized, setIsMaximized] = useState(false);
  const [beforeMaximizeDimensions, setBeforeMaximizeDimensions] = useState<Dimensions | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      e.stopPropagation();
      
      // Prevent text selection during dragging
      document.body.style.userSelect = 'none';
      
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
      // Restore text selection ability
      document.body.style.userSelect = '';
      
      onUpdate(node.id, currentPosition);
      setIsDragging(false);
    }
  }, [isDragging, currentPosition, node.id, onUpdate]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      // Restore text selection ability
      document.body.style.userSelect = '';
      
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
        width: resizeStart.width + deltaX,
        height: resizeStart.height + deltaY
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
          if (error) {
            import('@/lib/error-handler').then(({ handleError }) => {
              handleError(error, {
                title: "Content Update Failed",
                message: "Unable to save text content changes"
              });
            });
          }
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
      // Use standardized error handler
      import('@/lib/error-handler').then(({ handleError }) => {
        handleError(error, {
          title: "Delete Failed",
          message: "Unable to delete the node"
        });
      });
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      if (node.node_type === 'text') {
        // For text nodes, create a text file with the content
        const blob = new Blob([content || ''], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `text-note-${node.id.slice(0, 8)}.txt`;
        a.setAttribute('download', `text-note-${node.id.slice(0, 8)}.txt`);
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        
        // Only show notifications for errors, not for successful downloads
      } else if (node.file_path) {
        // For file nodes, need to fetch the file first to ensure it downloads properly
        // No notification needed for starting download
        
        // Get the public URL from Supabase
        const { data } = supabase.storage.from('slate_files').getPublicUrl(node.file_path);
        if (!data.publicUrl) throw new Error('Could not generate download URL');
        
        // Fetch the file as a blob to force download
        const response = await fetch(data.publicUrl);
        if (!response.ok) throw new Error('Failed to fetch file from storage');
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        // Create download link and trigger it
        const filename = node.file_name || `file-${node.id.slice(0, 8)}`;
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        a.setAttribute('download', filename); // Enforce download attribute
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        }, 100);
        
        // No notification for successful download - browser shows its own UI
      }
    } catch (error) {
      // Only show notifications for errors
      import('@/lib/error-handler').then(({ handleError }) => {
        handleError(error, {
          title: "Download Failed",
          message: "Unable to download the file to your device. Please try again."
        });
      });
    }
  };

  const handleToggleMaximize = useCallback(() => {
    if (isMaximized) {
      // Restore previous dimensions
      if (beforeMaximizeDimensions) {
        setCurrentDimensions(beforeMaximizeDimensions);
        onUpdate(node.id, currentPosition, beforeMaximizeDimensions);
        setBeforeMaximizeDimensions(null);
      }
    } else {
      // Save current dimensions and maximize
      setBeforeMaximizeDimensions(currentDimensions);
      // Set to a larger size - can be adjusted based on node type or screen size
      const newDimensions = { width: 600, height: 400 };
      setCurrentDimensions(newDimensions);
      onUpdate(node.id, currentPosition, newDimensions);
    }
    setIsMaximized(!isMaximized);
  }, [isMaximized, beforeMaximizeDimensions, currentDimensions, currentPosition, node.id, onUpdate]);

  // If node attributes change externally, update local state
  useEffect(() => {
    setCurrentPosition(safeParsePosition(node.position));
    setCurrentDimensions(safeParseDimensions(node.dimensions));
    setContent(node.content || '');
  }, [node.position, node.dimensions, node.content]);

  return (
    <div
      ref={nodeRef}
      id={`node-${node.id}`}
      className={cn(
        "absolute bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 group overflow-hidden transition-shadow duration-200",
        "hover:shadow-xl focus-within:ring-2 focus-within:ring-primary/50",
        (isDragging || isResizing) && "cursor-grabbing opacity-75"
      )}
      style={{
        transform: `translate(${currentPosition.x}px, ${currentPosition.y}px)`,
        width: currentDimensions.width,
        height: currentDimensions.height,
        transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s ease'
      }}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Drag handle at the top */}
      <TooltipProvider delayDuration={300}>
        <div 
          className="absolute top-0 left-0 right-0 h-8 bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600 flex items-center px-2 cursor-grab group"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <Move className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
          <div className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">
            {node.file_name || node.node_type}
          </div>
          
          <div className="flex space-x-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleToggleMaximize}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {isMaximized ? <ChevronsUpDown className="h-4 w-4 text-gray-500 dark:text-gray-400" /> : <Maximize2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{isMaximized ? "Restore" : "Maximize"}</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleDownload}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Download className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Download</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleDelete}
                  className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Delete</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>

      {/* Content area */}
      <div className="p-2 mt-8 w-full h-[calc(100%-32px)] overflow-auto">
        {node.node_type === 'text' && (
          <div className="w-full h-full">
            {isEditing ? (
              <textarea
                className="w-full h-full p-2 bg-transparent resize-none focus:outline-none text-sm text-gray-700 dark:text-gray-200 border rounded"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={handleBlur}
                autoFocus
              />
            ) : (
              <div className="w-full h-full overflow-auto">
                <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{content}</p>
              </div>
            )}
          </div>
        )}
        
        {(node.node_type === 'image' || node.node_type === 'video' || node.node_type === 'pdf') && (
          <FilePreview node={node} />
        )}
      </div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-tl transition-colors"
        onMouseDown={handleResizeStart}
        onMouseMove={handleResize}
        onMouseUp={handleResizeEnd}
        onMouseLeave={handleResizeEnd}
        style={{
          background: 'linear-gradient(135deg, transparent 50%, rgba(209, 213, 219, 0.5) 50%)',
        }}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparator for memoization
  return (
    prevProps.node.id === nextProps.node.id &&
    prevProps.scale === nextProps.scale &&
    JSON.stringify(prevProps.node.position) === JSON.stringify(nextProps.node.position) &&
    JSON.stringify(prevProps.node.dimensions) === JSON.stringify(nextProps.node.dimensions) &&
    prevProps.node.content === nextProps.node.content
  );
});

export { CanvasNode };
