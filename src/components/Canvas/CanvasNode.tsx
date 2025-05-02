import React, { useCallback, useRef, useState, useEffect } from "react";
import { Node } from "@/types";
import { cn } from "@/lib/utils";
import { FilePreview } from "./FilePreview";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Move, Maximize2, ChevronsUpDown, Download, Bold, Italic, Underline } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { highlightCode } from '@/lib/syntax-highlighter';
import 'highlight.js/styles/github-dark.css';
import { Components } from 'react-markdown';

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
  const [textStyle, setTextStyle] = useState<{
    bold: boolean;
    italic: boolean;
    underline: boolean;
  }>({
    bold: false,
    italic: false,
    underline: false
  });

  // Update last active node when editing starts
  useEffect(() => {
    if (isEditing && node.node_type === 'text') {
      localStorage.setItem(`last-text-node-${node.canvas_id}`, node.id);
    }
  }, [isEditing, node]);

  // Enhanced auto-save with visual feedback
  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    
    // Clear any pending update
    if (contentUpdateTimeoutRef.current) {
      clearTimeout(contentUpdateTimeoutRef.current);
    }
    
    // Only show saving indicator if content actually changed
    if (newContent !== lastSavedContent) {
      setIsSaving(true);
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
    }, 750); // Increased debounce time for better performance
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

  const applyFormatting = (style: 'bold' | 'italic' | 'underline') => {
    const formatText = (text: string) => {
      switch (style) {
        case 'bold':
          return `**${text}**`;
        case 'italic':
          return `_${text}_`;
        case 'underline':
          return `<u>${text}</u>`;
      }
    };

    // If not editing, just wrap the entire content
    if (!isEditing) {
      if (!content.trim()) return; // Don't format empty content
      const newContent = formatText(content);
      updateContent(newContent);
      return;
    }
    
    // If editing and text is selected, format only the selection
    const textarea = document.getElementById(`textarea-${node.id}`) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === end) return; // No text selected

    const selectedText = content.substring(start, end);
    const formattedText = formatText(selectedText);
    const newContent = content.substring(0, start) + formattedText + content.substring(end);
    updateContent(newContent);

    // Restore selection with offset for markdown syntax
    const offset = style === 'bold' ? 2 : (style === 'italic' ? 1 : 3);
    setTimeout(() => {
      textarea.selectionStart = start + offset;
      textarea.selectionEnd = end + offset;
      textarea.focus();
    }, 10);
  };

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

  const handleResizeMove = useCallback((clientX: number, clientY: number) => {
    const sensitivityFactor = 0.8;
    const deltaX = ((clientX - resizeStart.x) / scale) * sensitivityFactor;
    const deltaY = ((clientY - resizeStart.y) / scale) * sensitivityFactor;
    
    const minWidth = node.node_type === 'text' ? 150 : 100;
    const minHeight = node.node_type === 'text' ? 100 : 100;
    
    const newDimensions = {
      width: Math.max(resizeStart.width + deltaX, minWidth),
      height: Math.max(resizeStart.height + deltaY, minHeight)
    };
    
    setCurrentDimensions(newDimensions);
    return newDimensions;
  }, [resizeStart, scale, node.node_type]);

  const handleResizeEnd = useCallback((finalDimensions: Dimensions) => {
    document.body.style.userSelect = '';
    setIsResizing(false);
    setContent(resizeStart.content || content);
    onUpdate(node.id, currentPosition, finalDimensions);
  }, [node.id, currentPosition, resizeStart.content, content, onUpdate]);

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
        content: content
      });

      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        handleResizeMove(e.clientX, e.clientY);
      };

      const handleMouseUp = (e: MouseEvent) => {
        e.preventDefault();
        const finalDimensions = handleResizeMove(e.clientX, e.clientY);
        handleResizeEnd(finalDimensions);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  }, [currentDimensions, content, handleResizeMove, handleResizeEnd]);

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
      const finalDimensions = currentDimensions;
      handleResizeEnd(finalDimensions);
    } else if (isDragging) {
      document.body.style.userSelect = '';
      onUpdate(node.id, currentPosition);
      setIsDragging(false);
    }
  }, [isResizing, isDragging, currentDimensions, currentPosition, node.id, handleResizeEnd, onUpdate]);

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
        content: content
      });
    }
  }, [currentDimensions, content]);

  const handleTouchResize = useCallback((e: React.TouchEvent) => {
    if (isResizing && e.touches.length === 1) {
      e.stopPropagation();
      e.preventDefault();
      const touch = e.touches[0];
      handleResizeMove(touch.clientX, touch.clientY);
    }
  }, [isResizing, handleResizeMove]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (node.node_type === 'text' && !(e.target as HTMLElement).closest('.node-controls')) {
      e.stopPropagation();
      setIsEditing(true);
    }
  }, [node.node_type]);

  const handleBlur = () => {
    setIsEditing(false);
    // Force a final save of any pending content
    if (contentUpdateTimeoutRef.current) {
      clearTimeout(contentUpdateTimeoutRef.current);
      if (content !== lastSavedContent) {
        updateContent(content);
      }
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

  // Calculate border color based on node type
  const calculateBorderColor = useCallback(() => {
    const opacity = isDragging ? '40' : '60';
    switch (node.node_type) {
      case 'text':
        return `rgb(59 130 246 / ${opacity}%)`; // Blue
      case 'image':
        return `rgb(16 185 129 / ${opacity}%)`; // Green
      case 'video':
        return `rgb(239 68 68 / ${opacity}%)`; // Red
      case 'pdf':
        return `rgb(245 158 11 / ${opacity}%)`; // Amber
      default:
        return `rgb(156 163 175 / ${opacity}%)`; // Gray
    }
  }, [node.node_type, isDragging]);

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
        "absolute rounded-lg overflow-hidden transition-all duration-200",
        "bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900",
        "shadow-lg hover:shadow-xl",
        "before:absolute before:inset-0 before:rounded-lg before:pointer-events-none",
        "before:transition-opacity before:duration-200",
        "before:border-[1.5px] before:border-opacity-40 hover:before:border-opacity-60",
        isDragging && "cursor-grabbing opacity-75",
        !isDragging && !isEditing && "cursor-grab",
        isResizing && "cursor-se-resize opacity-75",
        isEditing && "ring-2 ring-primary/30 before:border-primary/60",
      )}
      style={{
        transform: `translate(${currentPosition.x}px, ${currentPosition.y}px)`,
        width: currentDimensions.width,
        height: currentDimensions.height,
        transition: isDragging || isResizing ? 'none' : 'all 0.2s ease-out',
        touchAction: "none",
        willChange: isDragging || isResizing ? "transform" : "auto",
        '--border-color': calculateBorderColor(),
      } as React.CSSProperties}
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
            {node.node_type === 'text' && (
              <>
                {isSaving && (
                  <div className="text-xs text-muted-foreground animate-pulse">
                    Saving...
                  </div>
                )}
                <div className="flex items-center gap-1 mr-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => applyFormatting('bold')}
                        className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
                        style={{ 
                          width: `${headerStyle.iconSize + 12}px`,
                          height: `${headerStyle.iconSize + 12}px`
                        }}
                      >
                        <Bold 
                          style={{ width: `${headerStyle.iconSize}px`, height: `${headerStyle.iconSize}px` }}
                          className="text-gray-500 dark:text-gray-400" 
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Bold selected text</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => applyFormatting('italic')}
                        className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
                        style={{ 
                          width: `${headerStyle.iconSize + 12}px`,
                          height: `${headerStyle.iconSize + 12}px`
                        }}
                      >
                        <Italic 
                          style={{ width: `${headerStyle.iconSize}px`, height: `${headerStyle.iconSize}px` }}
                          className="text-gray-500 dark:text-gray-400" 
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Italicize selected text</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => applyFormatting('underline')}
                        className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
                        style={{ 
                          width: `${headerStyle.iconSize + 12}px`,
                          height: `${headerStyle.iconSize + 12}px`
                        }}
                      >
                        <Underline 
                          style={{ width: `${headerStyle.iconSize}px`, height: `${headerStyle.iconSize}px` }}
                          className="text-gray-500 dark:text-gray-400" 
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Underline selected text</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </>
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
                <textarea
                  id={`textarea-${node.id}`}
                  className="w-full h-full p-2 bg-transparent resize-none focus:outline-none text-gray-700 dark:text-gray-200 border rounded font-mono"
                  value={content}
                  onChange={(e) => {
                    const newContent = e.target.value;
                    updateContent(newContent);
                    e.target.style.fontSize = calculateContentStyle().fontSize;
                  }}
                  onBlur={handleBlur}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={handleKeyDown}
                  style={{
                    ...contentStyle,
                    fontWeight: textStyle.bold ? 'bold' : 'normal',
                    fontStyle: textStyle.italic ? 'italic' : 'normal',
                    textDecoration: textStyle.underline ? 'underline' : 'none'
                  }}
                  autoFocus
                  spellCheck="true"
                  placeholder="Start typing... (Supports Markdown)"
                />
              </div>
            ) : (
              <div 
                className="w-full h-full overflow-auto prose dark:prose-invert max-w-none prose-sm"
                style={{
                  fontWeight: textStyle.bold ? 'bold' : 'normal',
                  fontStyle: textStyle.italic ? 'italic' : 'normal',
                  textDecoration: textStyle.underline ? 'underline' : 'none'
                }}
              >
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
