
import React, { useState, useRef, useCallback, useEffect, CSSProperties } from 'react';
import { Node } from "@/types";
import { Resizable } from 're-resizable';
import { safeParsePosition, safeParseDimensions } from './NodeList';
import { useDrag } from 'react-use-gesture';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

// Type definitions for node position and dimensions
type Position = { x: number; y: number };
type Dimensions = { width: number; height: number };

// Create custom hook for debouncing
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

interface CanvasNodeProps {
  node: Node;
  scale: number;
  onUpdate: (nodeId: string, position: Position, dimensions?: Dimensions) => Promise<void>;
  onDoubleClick?: (node: Node) => void;
}

export const CanvasNode: React.FC<CanvasNodeProps> = ({ node, scale, onUpdate, onDoubleClick }) => {
  const [position, setPosition] = useState<Position>(safeParsePosition(node.position));
  const [dimensions, setDimensions] = useState<Dimensions>(safeParseDimensions(node.dimensions));
  const [isEditing, setIsEditing] = useState(false);
  const [zIndex, setZIndex] = useState(1);
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  const [debouncedPosition] = useDebounce(position, 300);
  const [debouncedDimensions] = useDebounce(dimensions, 300);

  // Node style based on type
  const nodeStyle: Record<string, React.CSSProperties> = {
    'text': {
      minWidth: '100px',
      minHeight: '50px',
      padding: '0.5rem',
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '0.25rem',
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
      fontFamily: 'sans-serif',
      fontSize: '1rem',
      lineHeight: '1.4',
      wordWrap: 'break-word',
      overflow: 'hidden',
      whiteSpace: 'pre-wrap',
    },
    'image': {
      maxWidth: '300px',
      maxHeight: '200px',
      border: '1px solid #ddd',
      borderRadius: '0.25rem',
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    },
    'video': {
      maxWidth: '300px',
      maxHeight: '200px',
      border: '1px solid #ddd',
      borderRadius: '0.25rem',
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    },
    'pdf': {
      width: '200px',
      height: '250px',
      border: '1px solid #ddd',
      borderRadius: '0.25rem',
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: '1.2rem',
      fontWeight: 'bold',
      color: '#555',
    },
  };

  // Load file from Supabase storage
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  useEffect(() => {
    const fetchFile = async () => {
      if (node.file_path) {
        try {
          const { data } = await supabase.storage
            .from('canvas-files')
            .getPublicUrl(node.file_path);

          setFileUrl(data.publicUrl);
        } catch (error) {
          import('@/lib/error-handler').then(({ handleError }) => {
            handleError(error, {
              title: "File Load Failed",
              message: "Unable to load file from storage"
            });
          });
        }
      }
    };

    fetchFile();
  }, [node.file_path]);

  // Delete node from database
  const handleDeleteNode = async () => {
    try {
      const { error } = await supabase
        .from('nodes')
        .delete()
        .eq('id', node.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      import('@/lib/error-handler').then(({ handleError }) => {
        handleError(error, {
          title: "Node Delete Failed",
          message: "Unable to delete node"
        });
      });
    }
  };

  // Drag gesture handler
  const bind = useDrag(({ offset: [x, y], down, event }) => {
    if (isResizing) return;

    // Prevent dragging when interacting with form elements
    if ((event?.target as HTMLElement)?.tagName?.match(/INPUT|TEXTAREA|SELECT/)) return;

    setIsDragging(down);
    if (down) {
      setZIndex(100);
    } else {
      setZIndex(1);
    }

    setPosition(prev => ({
      x: prev.x + x / scale,
      y: prev.y + y / scale,
    }));
  }, {
    pointer: {
      touch: true,
    },
  });

  // Double click handler
  const handleDoubleClick = useCallback(() => {
    if (onDoubleClick) {
      onDoubleClick(node);
    }
  }, [node, onDoubleClick]);

  // Update position in database when debounced position changes
  useEffect(() => {
    if (isDragging) return;
    onUpdate(node.id, debouncedPosition, debouncedDimensions);
  }, [node.id, debouncedPosition, debouncedDimensions, onUpdate, isDragging]);

  // Handler for resize stop
  const handleResizeStop = useCallback((_e: any, _direction: any, ref: any, d: any) => {
    setIsResizing(false);
    setDimensions({
      width: ref.offsetWidth,
      height: ref.offsetHeight,
    });
    setPosition(prev => ({
      x: prev.x + d.width / scale / 2,
      y: prev.y + d.height / scale / 2,
    }));
  }, [scale]);

  // Handler for resize start
  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  // Handler for mouse enter
  const handleMouseEnter = useCallback(() => {
    setShowDeleteButton(true);
  }, []);

  // Handler for mouse leave
  const handleMouseLeave = useCallback(() => {
    setShowDeleteButton(false);
  }, []);

  return (
    <div
      ref={nodeRef}
      {...bind()}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: isDragging ? 100 : zIndex,
      }}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Resizable
        style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        size={{ width: dimensions.width, height: dimensions.height }}
        onResizeStop={handleResizeStop}
        onResizeStart={handleResizeStart}
        enable={{
          top: false,
          right: true,
          bottom: true,
          left: false,
          topRight: false,
          bottomRight: true,
          bottomLeft: false,
          topLeft: false,
        }}
        minWidth={50}
        minHeight={50}
      >
        {node.node_type === 'text' && (
          <div style={nodeStyle['text']}>
            {node.content}
          </div>
        )}

        {node.node_type === 'image' && fileUrl && (
          <img src={fileUrl} alt={node.file_name || 'Canvas Image'} style={nodeStyle['image']} />
        )}

        {node.node_type === 'video' && fileUrl && (
          <video src={fileUrl} controls style={nodeStyle['video']} />
        )}

        {node.node_type === 'pdf' && (
          <div style={nodeStyle['pdf']}>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              View PDF
            </a>
          </div>
        )}

        {showDeleteButton && (
          <Button
            variant="destructive"
            size="icon"
            onClick={handleDeleteNode}
            className="absolute top-1 right-1 z-50"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </Resizable>
    </div>
  );
};
