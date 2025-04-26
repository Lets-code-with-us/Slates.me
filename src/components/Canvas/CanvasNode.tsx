import React, { useCallback, useRef, useState, useEffect } from "react";
import { Node } from "@/types";
import { cn } from "@/lib/utils";
import { FilePreview } from "./FilePreview";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Move, Maximize2, ChevronsUpDown, Download, Code2, BookOpen } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { highlightCode } from '@/lib/syntax-highlighter';
import 'highlight.js/styles/github-dark.css';
import { Components } from 'react-markdown';
import { codeSnippets } from '@/lib/code-snippets';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Type definitions for position and dimensions (same as in NodeList)
type Position = { x: number; y: number };
type Dimensions = { width: number; height: number };

// Add type for code block props
type CodeProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
  inline?: boolean;
};

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

const CanvasNode: React.FC<CanvasNodeProps> = ({ node, scale, onUpdate }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0, content: '' });
  const position = safeParsePosition(node.position);
  const dimensions = safeParseDimensions(node.dimensions);
  const [currentPosition, setCurrentPosition] = useState(position);
  const [currentDimensions, setCurrentDimensions] = useState(dimensions);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(node.content || '');
  const [isMaximized, setIsMaximized] = useState(false);
  const [beforeMaximizeDimensions, setBeforeMaximizeDimensions] = useState<Dimensions | null>(null);
  const contentUpdateTimeoutRef = useRef<NodeJS.Timeout>();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState(node.content || '');
  const lastSaveTimeRef = useRef<number>(0);

  // Update last active node when editing starts
  useEffect(() => {
    if (isEditing && node.node_type === 'text') {
      localStorage.setItem(`last-text-node-${node.canvas_id}`, node.id);
    }
  }, [isEditing, node]);

  // Enhanced auto-save with visual feedback
  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    setIsSaving(true);
    
    // Clear any pending update
    if (contentUpdateTimeoutRef.current) {
      clearTimeout(contentUpdateTimeoutRef.current);
    }
    
    // Set new timeout for update
    contentUpdateTimeoutRef.current = setTimeout(async () => {
      try {
        const now = Date.now();
        // Only save if content changed and enough time passed since last save
        if (newContent !== lastSavedContent && now - lastSaveTimeRef.current > 1000) {
          const { error } = await supabase
            .from('nodes')
            .update({ 
              content: newContent,
              updated_at: new Date().toISOString()
            })
            .eq('id', node.id);

          if (error) throw error;
          setLastSavedContent(newContent);
          lastSaveTimeRef.current = now;
        }
      } catch (error) {
        import('@/lib/error-handler').then(({ handleError }) => {
          handleError(error, {
            title: "Content Update Failed",
            message: "Unable to save text content changes"
          });
        });
      } finally {
        setIsSaving(false);
      }
    }, 500); // Debounce time of 500ms
  }, [node.id, lastSavedContent]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (contentUpdateTimeoutRef.current) {
        clearTimeout(contentUpdateTimeoutRef.current);
      }
    };
  }, []);

  // Keep content in sync with node
  useEffect(() => {
    if (node.content !== content && !isEditing) {
      setContent(node.content || '');
    }
  }, [node.content, isEditing]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't handle mouse down for text areas or when editing
    if (isEditing || (e.target as HTMLElement).closest('textarea')) {
      return;
    }

    if (e.button === 0 && !(e.target as HTMLElement).closest('button')) {
      e.stopPropagation();
      document.body.style.userSelect = 'none';
      setIsDragging(true);
      setDragStart({
        x: e.clientX / scale - position.x,
        y: e.clientY / scale - position.y
      });
    }
  }, [scale, position, isEditing]);

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
    // Handle resize end
    if (isResizing) {
      document.body.style.userSelect = '';
      // Ensure content is preserved after resize
      setContent(resizeStart.content || content);
      onUpdate(node.id, currentPosition, currentDimensions);
      setIsResizing(false);
    }
    
    // Handle drag end
    if (isDragging) {
      document.body.style.userSelect = '';
      onUpdate(node.id, currentPosition);
      setIsDragging(false);
    }
  }, [isDragging, isResizing, currentPosition, currentDimensions, node.id, onUpdate, resizeStart.content, content]);

  const handleMouseLeave = useCallback(() => {
    // Don't end drag/resize on leave - only on mouse up
    if (isResizing || isDragging) {
      document.addEventListener('mouseup', handleMouseUp, { once: true });
    }
  }, [isResizing, isDragging, handleMouseUp]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {  // Only start resize on left click
      e.stopPropagation();
      e.preventDefault();
      document.body.style.userSelect = 'none';
      setIsResizing(true);
      setResizeStart({
        width: currentDimensions.width,
        height: currentDimensions.height,
        x: e.clientX,
        y: e.clientY,
        content: content // Save current content state
      });

      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        const sensitivityFactor = 0.8;
        const deltaX = ((e.clientX - resizeStart.x) / scale) * sensitivityFactor;
        const deltaY = ((e.clientY - resizeStart.y) / scale) * sensitivityFactor;
        
        const newDimensions = {
          width: Math.max(resizeStart.width + deltaX, 100),
          height: Math.max(resizeStart.height + deltaY, 100)
        };
        
        setCurrentDimensions(newDimensions);
      };

      const handleMouseUp = (e: MouseEvent) => {
        e.preventDefault();
        document.body.style.userSelect = '';
        
        // Ensure we're using the latest dimensions
        const finalDimensions = {
          width: Math.max(resizeStart.width + ((e.clientX - resizeStart.x) / scale) * 0.8, 100),
          height: Math.max(resizeStart.height + ((e.clientY - resizeStart.y) / scale) * 0.8, 100)
        };
        
        setCurrentDimensions(finalDimensions);
        setIsResizing(false);
        
        // Update with final dimensions
        onUpdate(node.id, currentPosition, finalDimensions);
        
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  }, [currentDimensions, scale, currentPosition, node.id, onUpdate, resizeStart.x, resizeStart.y, content]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && !(e.target as HTMLElement).closest('button') && !(e.target as HTMLElement).closest('textarea')) {
      e.stopPropagation();
      
      const touch = e.touches[0];
      document.body.style.userSelect = 'none';
      setIsDragging(true);
      setDragStart({
        x: touch.clientX / scale - position.x,
        y: touch.clientY / scale - position.y
      });
    }
  }, [scale, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      e.stopPropagation();
      e.preventDefault();
      const touch = e.touches[0];
      const newPosition = {
        x: touch.clientX / scale - dragStart.x,
        y: touch.clientY / scale - dragStart.y
      };
      setCurrentPosition(newPosition);
    }
  }, [isDragging, dragStart, scale]);

  const handleTouchEnd = useCallback(() => {
    if (isResizing) {
      document.body.style.userSelect = '';
      // Calculate final dimensions based on the last touch position
      const finalDimensions = currentDimensions;
      setCurrentDimensions(finalDimensions);
      setIsResizing(false);
      // Update with final dimensions
      onUpdate(node.id, currentPosition, finalDimensions);
    }
    if (isDragging) {
      document.body.style.userSelect = '';
      onUpdate(node.id, currentPosition);
      setIsDragging(false);
    }
  }, [isDragging, isResizing, currentPosition, currentDimensions, node.id, onUpdate]);

  const handleTouchResizeStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      e.stopPropagation();
      e.preventDefault();
      document.body.style.userSelect = 'none';
      setIsResizing(true);
      const touch = e.touches[0];
      setResizeStart({
        width: currentDimensions.width,
        height: currentDimensions.height,
        x: touch.clientX,
        y: touch.clientY,
        content: content // Save current content state
      });
    }
  }, [currentDimensions, content]);

  const handleTouchResize = useCallback((e: React.TouchEvent) => {
    if (isResizing && e.touches.length === 1) {
      e.stopPropagation();
      e.preventDefault();
      const touch = e.touches[0];
      const deltaX = (touch.clientX - resizeStart.x) / scale;
      const deltaY = (touch.clientY - resizeStart.y) / scale;
      const newDimensions = {
        width: Math.max(resizeStart.width + deltaX, 100),
        height: Math.max(resizeStart.height + deltaY, 100)
      };
      setCurrentDimensions(newDimensions);
    }
  }, [isResizing, resizeStart, scale]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (node.node_type === 'text' && !(e.target as HTMLElement).closest('.node-controls')) {
      e.stopPropagation();
      setIsEditing(true);
    }
  }, [node.node_type]);

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

  // Calculate border width based on node dimensions
  const calculateBorderWidth = useCallback(() => {
    const baseBorder = 1;
    const minBorder = 1;
    const maxBorder = 3;
    const scaleFactor = Math.min(currentDimensions.width, currentDimensions.height) / 200;
    return Math.min(maxBorder, Math.max(minBorder, baseBorder * Math.log10(scaleFactor + 1)));
  }, [currentDimensions]);

  // Calculate header sizes based on node dimensions
  const calculateHeaderStyle = useCallback(() => {
    // More aggressive scaling based on node size
    const minHeight = 32;
    const maxHeight = 56; // Increased max height
    const baseHeight = Math.min(currentDimensions.width, currentDimensions.height) / 8; // More aggressive ratio
    const headerHeight = Math.min(maxHeight, Math.max(minHeight, baseHeight));
    
    // Calculate font size with wider range
    const minFontSize = 13;
    const maxFontSize = 20; // Increased max font size
    const fontSize = Math.min(maxFontSize, Math.max(minFontSize, headerHeight / 2));
    
    // Calculate icon sizes with wider range
    const minIconSize = 16;
    const maxIconSize = 24; // Increased max icon size
    const iconSize = Math.min(maxIconSize, Math.max(minIconSize, headerHeight / 2));
    
    return {
      height: headerHeight,
      fontSize: fontSize,
      iconSize: iconSize
    };
  }, [currentDimensions]);

  // Calculate content text size based on node dimensions and content
  const calculateContentStyle = useCallback(() => {
    const minFontSize = 13;
    const maxFontSize = 24; // Increased max font size
    
    // Calculate area available for text
    const contentArea = currentDimensions.width * currentDimensions.height;
    const contentLength = content?.length || 0;
    
    // Calculate optimal font size based on area and content length
    const areaPerChar = Math.sqrt(contentArea / Math.max(contentLength, 1));
    const dynamicFontSize = areaPerChar * 0.8; // Adjust this multiplier to fine-tune the scaling
    
    // Calculate font size based on node dimensions
    const dimensionBasedSize = Math.min(
      currentDimensions.width / 20,
      currentDimensions.height / 10
    );
    
    // Use the smaller of the two calculations to ensure text fits
    const calculatedSize = Math.min(dynamicFontSize, dimensionBasedSize);
    const finalFontSize = Math.min(maxFontSize, Math.max(minFontSize, calculatedSize));
    
    return {
      fontSize: `${finalFontSize}px`,
      lineHeight: '1.5',
      transition: isDragging || isResizing ? 'none' : 'font-size 0.2s ease'
    };
  }, [currentDimensions, content, isDragging, isResizing]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    
    // Save on Ctrl+S or Cmd+S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      setIsEditing(false);
      return;
    }

    // Support tab indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      
      // Multi-line tab support
      if (start !== end) {
        const lines = content.split('\n');
        let startLine = content.substring(0, start).split('\n').length - 1;
        let endLine = content.substring(0, end).split('\n').length - 1;
        
        // If selection ends at start of line, don't include that line
        if (end > 0 && content.substring(0, end).endsWith('\n')) {
          endLine--;
        }
        
        const newLines = lines.map((line, i) => {
          if (i >= startLine && i <= endLine) {
            return '    ' + line;
          }
          return line;
        });
        
        const newContent = newLines.join('\n');
        updateContent(newContent);
        
        // Adjust selection to maintain relative positions
        setTimeout(() => {
          target.selectionStart = start + 4;
          target.selectionEnd = end + 4 * (endLine - startLine + 1);
        }, 0);
      } else {
        // Single line tab insertion
        const newContent = content.substring(0, start) + '    ' + content.substring(end);
        updateContent(newContent);
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 4;
        }, 0);
      }
      return;
    }

    // Handle Shift+Tab for unindent
    if (e.shiftKey && e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      
      // Multi-line unindent
      if (start !== end) {
        const lines = content.split('\n');
        let startLine = content.substring(0, start).split('\n').length - 1;
        let endLine = content.substring(0, end).split('\n').length - 1;
        
        // If selection ends at start of line, don't include that line
        if (end > 0 && content.substring(0, end).endsWith('\n')) {
          endLine--;
        }
        
        const newLines = lines.map((line, i) => {
          if (i >= startLine && i <= endLine) {
            return line.replace(/^( {1,4}|\t)/, '');
          }
          return line;
        });
        
        const newContent = newLines.join('\n');
        updateContent(newContent);
        
        // Adjust selection
        setTimeout(() => {
          target.selectionStart = start - (lines[startLine].startsWith('    ') ? 4 : 0);
          target.selectionEnd = end - (endLine - startLine + 1) * 4;
        }, 0);
      } else {
        // Single line unindent
        const currentLine = content.split('\n')[content.substring(0, start).split('\n').length - 1];
        if (currentLine.startsWith('    ')) {
          const newContent = content.substring(0, start - 4) + content.substring(start);
          updateContent(newContent);
          setTimeout(() => {
            target.selectionStart = target.selectionEnd = start - 4;
          }, 0);
        }
      }
      return;
    }

    // Auto-close brackets and quotes
    const pairs: { [key: string]: string } = {
      '(': ')',
      '{': '}',
      '[': ']',
      '"': '"',
      "'": "'",
      '`': '`'
    };

    if (pairs[e.key]) {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      
      // If text is selected, wrap it in the pairs
      if (start !== end) {
        const newContent = 
          content.substring(0, start) + 
          e.key + 
          content.substring(start, end) + 
          pairs[e.key] + 
          content.substring(end);
        updateContent(newContent);
        setTimeout(() => {
          target.selectionStart = start + 1;
          target.selectionEnd = end + 1;
        }, 0);
      } else {
        const newContent = 
          content.substring(0, start) + 
          e.key + 
          pairs[e.key] + 
          content.substring(end);
        updateContent(newContent);
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 1;
        }, 0);
      }
      return;
    }

    // Auto-close Markdown code blocks
    if (e.key === '`') {
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      
      if (content.substring(start - 2, start) === '``') {
        e.preventDefault();
        const newContent = 
          content.substring(0, start) + 
          '`\n\n```' + 
          content.substring(end);
        updateContent(newContent);
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 1;
        }, 0);
      }
      return;
    }
  };

  const headerStyle = calculateHeaderStyle();
  const contentStyle = calculateContentStyle();

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
        "absolute bg-white dark:bg-gray-800 rounded-lg shadow-lg group overflow-hidden transition-shadow duration-200",
        "hover:shadow-xl focus-within:ring-2 focus-within:ring-primary/50",
        isDragging && "cursor-grabbing opacity-75",
        !isDragging && !isEditing && "cursor-grab",
        isResizing && "cursor-se-resize opacity-75"
      )}
      style={{
        transform: `translate(${currentPosition.x}px, ${currentPosition.y}px)`,
        width: currentDimensions.width,
        height: currentDimensions.height,
        transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s ease, border-width 0.2s ease',
        touchAction: "none",
        willChange: isDragging || isResizing ? "transform" : "auto",
        borderWidth: `${calculateBorderWidth()}px`,
        borderStyle: 'solid',
        borderColor: 'var(--border)',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
    >
      {/* Header bar with controls */}
      <TooltipProvider delayDuration={300}>
        <div 
          className="absolute top-0 left-0 right-0 bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600 flex items-center px-3 transition-all duration-200"
          style={{ 
            height: `${headerStyle.height}px`,
            minHeight: '32px'
          }}
        >
          <Move 
            className="text-gray-500 dark:text-gray-400 mr-3 flex-shrink-0" 
            style={{ 
              width: `${headerStyle.iconSize}px`,
              height: `${headerStyle.iconSize}px`
            }}
          />
          <div 
            className="text-gray-600 dark:text-gray-300 truncate flex-1 select-none font-medium"
            style={{ fontSize: `${headerStyle.fontSize}px` }}
          >
            {node.file_name || node.node_type}
          </div>
          
          <div className="flex items-center gap-2">
            {node.node_type === 'text' && isSaving && (
              <div className="text-xs text-muted-foreground animate-pulse">
                Saving...
              </div>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleToggleMaximize}
                  className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
                  style={{ 
                    width: `${headerStyle.iconSize + 12}px`,
                    height: `${headerStyle.iconSize + 12}px`
                  }}
                >
                  {isMaximized ? 
                    <ChevronsUpDown style={{ width: `${headerStyle.iconSize}px`, height: `${headerStyle.iconSize}px` }} className="text-gray-500 dark:text-gray-400" /> : 
                    <Maximize2 style={{ width: `${headerStyle.iconSize}px`, height: `${headerStyle.iconSize}px` }} className="text-gray-500 dark:text-gray-400" />
                  }
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
                  className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
                  style={{ 
                    width: `${headerStyle.iconSize + 12}px`,
                    height: `${headerStyle.iconSize + 12}px`
                  }}
                >
                  <Download 
                    style={{ width: `${headerStyle.iconSize}px`, height: `${headerStyle.iconSize}px` }}
                    className="text-gray-500 dark:text-gray-400" 
                  />
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
                  className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center"
                  style={{ 
                    width: `${headerStyle.iconSize + 12}px`,
                    height: `${headerStyle.iconSize + 12}px`
                  }}
                >
                  <Trash2 
                    style={{ width: `${headerStyle.iconSize}px`, height: `${headerStyle.iconSize}px` }}
                    className="text-red-500 dark:text-red-400" 
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Delete</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>

      {/* Content area with dynamic text size */}
      <div 
        className="p-2 w-full overflow-auto"
        style={{ 
          height: `calc(100% - ${headerStyle.height}px)`,
          marginTop: `${headerStyle.height}px`
        }}
      >
        {node.node_type === 'text' && (
          <div className="w-full h-full" onDoubleClick={handleDoubleClick}>
            {isEditing ? (
              <div className="w-full h-full relative">
                <div className="absolute right-2 top-2 z-[60] flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="p-1.5 rounded bg-muted hover:bg-accent text-xs text-muted-foreground hover:text-accent-foreground flex items-center gap-2"
                        type="button"
                      >
                        <Code2 className="h-4 w-4" />
                        <span>Insert Code</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-[300px] p-0" 
                      align="end"
                      side="bottom"
                      sideOffset={5}
                      style={{ zIndex: 100 }}
                    >
                      <Command className="rounded-lg border shadow-md">
                        <CommandInput autoFocus placeholder="Search snippets..." />
                        <CommandList className="max-h-[300px] overflow-y-auto">
                          <CommandEmpty>No snippets found.</CommandEmpty>
                          {Object.entries(codeSnippets).map(([language, snippets]) => (
                            <CommandGroup key={language} heading={language.toUpperCase()}>
                              {snippets.map((snippet) => (
                                <CommandItem
                                  key={snippet.title}
                                  onSelect={() => {
                                    const textarea = document.querySelector(`#textarea-${node.id}`) as HTMLTextAreaElement;
                                    if (textarea) {
                                      const start = textarea.selectionStart;
                                      const end = textarea.selectionEnd;
                                      const newContent = 
                                        content.substring(0, start) +
                                        "\n```" + snippet.language + "\n" +
                                        snippet.code +
                                        "\n```\n" +
                                        content.substring(end);
                                      updateContent(newContent);
                                      textarea.focus();
                                      const newCursorPos = start + snippet.code.length + snippet.language.length + 7;
                                      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
                                    }
                                  }}
                                  className="flex items-start gap-2 py-3"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{snippet.title}</span>
                                    <span className="text-xs text-muted-foreground">{snippet.description}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <a
                    href="https://www.markdownguide.org/basic-syntax/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded bg-muted hover:bg-accent text-xs text-muted-foreground hover:text-accent-foreground flex items-center gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>Guide</span>
                  </a>
                </div>
                <textarea
                  id={`textarea-${node.id}`}
                  className="w-full h-full p-2 bg-transparent resize-none focus:outline-none text-gray-700 dark:text-gray-200 border rounded font-mono"
                  value={content}
                  onChange={(e) => {
                    const newContent = e.target.value;
                    updateContent(newContent);
                    e.target.style.fontSize = calculateContentStyle().fontSize;
                  }}
                  onBlur={() => setIsEditing(false)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={handleKeyDown}
                  style={contentStyle}
                  autoFocus
                  spellCheck="true"
                  placeholder="Start typing... (Supports Markdown & Code Snippets)"
                />
              </div>
            ) : (
              <div className="w-full h-full overflow-auto prose dark:prose-invert max-w-none prose-sm">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, rehypeSanitize]}
                  components={{
                    // Override styles for specific elements
                    a: ({node, ...props}) => (
                      <a {...props} className="text-primary hover:text-primary/80 no-underline hover:underline" target="_blank" rel="noopener noreferrer" />
                    ),
                    code: ({inline, className, children, ...props}: CodeProps) => {
                      const match = /language-(\w+)/.exec(className || '');
                      const language = match ? match[1] : undefined;
                      const code = String(children).replace(/\n$/, '');
                      
                      if (inline) {
                        return (
                          <code 
                            className={cn(
                              "bg-muted px-1.5 py-0.5 rounded-sm font-mono text-sm",
                              className
                            )} 
                            {...props}
                          >
                            {code}
                          </code>
                        );
                      }

                      const highlighted = highlightCode(code, language);
                      
                      return (
                        <div className="relative group">
                          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(code);
                              }}
                              className="p-1.5 rounded bg-muted/50 hover:bg-muted text-xs text-muted-foreground hover:text-foreground"
                            >
                              Copy
                            </button>
                          </div>
                          {language && (
                            <div className="absolute right-2 top-2 text-xs text-muted-foreground font-mono opacity-50">
                              {language}
                            </div>
                          )}
                          <pre className="relative bg-muted p-4 rounded-lg overflow-x-auto">
                            <code
                              className={cn("block font-mono text-sm", className)}
                              dangerouslySetInnerHTML={{ __html: highlighted }}
                            />
                          </pre>
                        </div>
                      );
                    },
                    img: ({node, ...props}) => (
                      <img {...props} className="rounded-lg max-h-64 object-contain" />
                    ),
                    blockquote: ({node, ...props}) => (
                      <blockquote {...props} className="border-l-4 border-muted pl-4 italic" />
                    ),
                    table: ({node, ...props}) => (
                      <div className="overflow-x-auto">
                        <table {...props} className="border-collapse table-auto w-full text-sm" />
                      </div>
                    ),
                    th: ({node, ...props}) => (
                      <th {...props} className="border border-muted px-4 py-2 text-left font-medium" />
                    ),
                    td: ({node, ...props}) => (
                      <td {...props} className="border border-muted px-4 py-2" />
                    )
                  }}
                >
                  {content || 'Double click to edit'}
                </ReactMarkdown>
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
        className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-tl transition-colors"
        onMouseDown={handleResizeStart}
        onTouchStart={handleTouchResizeStart}
        onTouchMove={handleTouchResize}
        onTouchEnd={handleTouchEnd}
        style={{
          background: 'linear-gradient(135deg, transparent 50%, rgba(209, 213, 219, 0.5) 50%)',
        }}
      />
    </div>
  );
};

export { CanvasNode };
