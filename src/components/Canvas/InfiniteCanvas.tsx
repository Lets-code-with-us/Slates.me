import { useCallback, useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useCanvas } from "@/hooks/useCanvas";
import { NodeList } from "./NodeList";
import { CanvasControls } from "./CanvasControls";
import { Minimap } from "./Minimap";
import { NodeFinder } from "./NodeFinder";
import { LinkManager } from "./LinkManager";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { NodeData } from "@/types";
import { animate } from "../../lib/animation";

export const InfiniteCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const { code } = useParams();
  const [lastActiveTextNodeId, setLastActiveTextNodeId] = useState<string | null>(null);
  
  // Get canvas data and nodes
  const { nodes, canvas, viewConfig, updateViewConfig } = useCanvas(code);
  const [isInitialized, setIsInitialized] = useState(false);
  const [viewportBounds, setViewportBounds] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [loadingState] = useState<'initializing' | 'loading-canvas' | 'loading-nodes' | 'ready' | 'error'>('ready');

  // Improved debounce implementation with two tiers:
  // - Fast updates for smooth UI feedback
  // - Slower persisted updates to reduce database load
  const debouncedUpdateViewConfig = useCallback(
    (() => {
      let uiTimeoutId: NodeJS.Timeout;
      let dbTimeoutId: NodeJS.Timeout;
      
      return (config: { zoom: number; position: { x: number; y: number } }) => {
        // Clear existing timeouts
        clearTimeout(uiTimeoutId);
        clearTimeout(dbTimeoutId);
        
        // Update UI state quickly (150ms)
        uiTimeoutId = setTimeout(() => {
          // Update local state for responsive UI
          setScale(config.zoom);
          setPosition(config.position);
        }, 150);
        
        // Persist to database with longer delay (1.5s)
        dbTimeoutId = setTimeout(() => {
          updateViewConfig(config);
        }, 1500);
      };
    })(),
    [updateViewConfig]
  );

  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setViewportBounds({
        x: -position.x / scale,
        y: -position.y / scale,
        width: width / scale,
        height: height / scale
      });
    }
  }, [position, scale]);

  useEffect(() => {
    if (canvas && viewConfig && !isInitialized) {
      setScale(viewConfig.zoom || 1);
      setPosition(viewConfig.position || { x: 0, y: 0 });
      setIsInitialized(true);
    }
  }, [canvas, viewConfig, isInitialized]);

  useEffect(() => {
    const lastNodeId = localStorage.getItem(`last-text-node-${code}`);
    if (lastNodeId) {
      setLastActiveTextNodeId(lastNodeId);
    }
  }, [code]);

  useEffect(() => {
    if (nodes.length > 0 && isInitialized) {
      if (lastActiveTextNodeId) {
        const lastNode = nodes.find(n => n.id === lastActiveTextNodeId);
        if (lastNode) {
          handleNavigateToNode(lastNode.id);
        } else {
          centerViewOnContent();
        }
      } else if (!viewConfig) {
        centerViewOnContent();
      }
    }
  }, [nodes, isInitialized, lastActiveTextNodeId, viewConfig]);

  const animateToPosition = useCallback((targetPosition: {x: number, y: number}, targetScale?: number) => {
    const startPosition = {...position};
    const startScale = scale;
    const finalScale = targetScale || scale;

    animate({
      duration: 600,
      easing: 'easeOutCubic',
      onProgress: (progress) => {
        // Interpolate between start and target positions
        setPosition({
          x: startPosition.x + (targetPosition.x - startPosition.x) * progress,
          y: startPosition.y + (targetPosition.y - startPosition.y) * progress
        });
        
        // If scale change requested, animate that too
        if (targetScale) {
          setScale(startScale + (finalScale - startScale) * progress);
        }
      },
      onComplete: () => {
        // Ensure we end at exact target values
        setPosition(targetPosition);
        if (targetScale) setScale(finalScale);
        
        // Update the server with final position
        debouncedUpdateViewConfig({ 
          zoom: finalScale, 
          position: targetPosition 
        });
      }
    });
  }, [position, scale, debouncedUpdateViewConfig]);

  const centerViewOnContent = useCallback(() => {
    if (!containerRef.current || nodes.length === 0) return;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    nodes.forEach(node => {
      const position = typeof node.position === 'string' 
        ? JSON.parse(node.position) 
        : node.position;

      const dimensions = typeof node.dimensions === 'string'
        ? JSON.parse(node.dimensions)
        : node.dimensions;

      minX = Math.min(minX, position.x);
      minY = Math.min(minY, position.y);
      maxX = Math.max(maxX, position.x + dimensions.width);
      maxY = Math.max(maxY, position.y + dimensions.height);
    });

    if (minX !== Infinity) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const targetPosition = {
        x: -(centerX * scale) + (width / 2),
        y: -(centerY * scale) + (height / 2)
      };

      animateToPosition(targetPosition);
    }
  }, [nodes, scale, animateToPosition]);

  useEffect(() => {
    const preventDefaultZoom = (e: WheelEvent | TouchEvent) => {
      if ((e as WheelEvent).ctrlKey || 
          (e as TouchEvent).touches && (e as TouchEvent).touches.length > 1) {
        e.preventDefault();
      }
    };

    document.addEventListener('wheel', preventDefaultZoom, { passive: false });
    document.addEventListener('touchmove', preventDefaultZoom, { passive: false });

    return () => {
      document.removeEventListener('wheel', preventDefaultZoom);
      document.removeEventListener('touchmove', preventDefaultZoom);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setViewportBounds({
          x: -position.x / scale,
          y: -position.y / scale,
          width: width / scale,
          height: height / scale
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, scale]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      // Calculate zoom factor based on wheel direction
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(Math.max(scale * delta, 0.1), 5);
      
      if (containerRef.current) {
        // Get cursor position relative to the container
        const rect = containerRef.current.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;
        
        // Calculate the world position under cursor before zoom
        const worldX = (cursorX - position.x) / scale;
        const worldY = (cursorY - position.y) / scale;
        
        // Calculate new position to keep the world position under cursor
        const newPosition = {
          x: cursorX - worldX * newScale,
          y: cursorY - worldY * newScale
        };
        
        setScale(newScale);
        setPosition(newPosition);
        debouncedUpdateViewConfig({ zoom: newScale, position: newPosition });
      }
    } else {
      const newPosition = {
        x: position.x - e.deltaX,
        y: position.y - e.deltaY,
      };
      setPosition(newPosition);
      debouncedUpdateViewConfig({ zoom: scale, position: newPosition });
    }
  }, [scale, position, debouncedUpdateViewConfig]);

  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialScale, setInitialScale] = useState<number>(1);

  const calculateDistance = (touches: React.TouchList) => {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only handle single touch on canvas itself
    if (e.touches.length === 1 && e.target === e.currentTarget) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ 
        x: touch.clientX - position.x, 
        y: touch.clientY - position.y 
      });
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const distance = calculateDistance(e.touches);
      setInitialPinchDistance(distance);
      setInitialScale(scale);
    }
  }, [position, scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const currentDistance = calculateDistance(e.touches);
      const pinchRatio = currentDistance / (initialPinchDistance || currentDistance);
      const newScale = Math.min(Math.max(initialScale * pinchRatio, 0.1), 5);
      
      // Calculate center point between fingers
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      
      // Calculate the world position under the center point
      const worldX = (centerX - position.x) / scale;
      const worldY = (centerY - position.y) / scale;
      
      // Calculate new position to keep the center point fixed
      const newPosition = {
        x: centerX - worldX * newScale,
        y: centerY - worldY * newScale
      };
      
      setScale(newScale);
      setPosition(newPosition);
    } else if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      const newPosition = {
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      };
      setPosition(newPosition);
    }
  }, [initialPinchDistance, initialScale, isDragging, dragStart, scale, position]);

  const handleTouchEnd = useCallback(() => {
    if (initialPinchDistance !== null) {
      setInitialPinchDistance(null);
      debouncedUpdateViewConfig({ zoom: scale, position });
    }

    if (isDragging) {
      setIsDragging(false);
      debouncedUpdateViewConfig({ zoom: scale, position });
    }
  }, [initialPinchDistance, isDragging, scale, position, debouncedUpdateViewConfig]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only handle left click and ignore clicks on nodes or controls
    if (e.button === 0 && e.target === e.currentTarget) {
      document.body.style.userSelect = 'none';
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      const newPosition = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      };
      setPosition(newPosition);
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      document.body.style.userSelect = '';
      debouncedUpdateViewConfig({ zoom: scale, position });
      setIsDragging(false);
    }
  }, [isDragging, scale, position, debouncedUpdateViewConfig]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      // Add a global mouse up listener to handle cases where the mouse leaves the window
      document.addEventListener('mouseup', () => {
        document.body.style.userSelect = '';
        debouncedUpdateViewConfig({ zoom: scale, position });
        setIsDragging(false);
      }, { once: true });
    }
  }, [isDragging, scale, position, debouncedUpdateViewConfig]);

  const handleAddNode = async (nodeData: NodeData) => {
    try {
      if (!canvas?.id) {
        throw new Error('No active canvas');
      }

      // Ensure all required fields are present
      const nodeForInsert = {
        canvas_id: canvas.id,
        node_type: nodeData.node_type,
        content: nodeData.content || null,
        position: JSON.stringify(nodeData.position),
        dimensions: JSON.stringify(nodeData.dimensions),
        file_path: nodeData.file_path || null,
        file_name: nodeData.file_name || null,
        file_type: nodeData.file_type || null,
        style: nodeData.style ? JSON.stringify(nodeData.style) : null
      };

      const { data, error } = await supabase
        .from('nodes')
        .insert(nodeForInsert)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('No data returned after node creation');
      }

      // Navigate to the newly created node
      const position = typeof nodeData.position === 'string' 
        ? JSON.parse(nodeData.position) 
        : nodeData.position;

      const dimensions = typeof nodeData.dimensions === 'string'
        ? JSON.parse(nodeData.dimensions)
        : nodeData.dimensions;

      // Calculate target position to center the node in the viewport
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const targetX = -(position.x * scale) + (width / 2) - (dimensions.width * scale / 2);
        const targetY = -(position.y * scale) + (height / 2) - (dimensions.height * scale / 2);
        
        // Animate to the new node's position
        animateToPosition({ x: targetX, y: targetY });
      }

      return data;
    } catch (error) {
      import('@/lib/error-handler').then(({ handleError }) => {
        handleError(error, {
          title: "Node Creation Failed",
          message: `Could not create ${nodeData.node_type} node. Please try again.`,
          action: "Check your connection and refresh the page if the problem persists"
        });
      });
      return null;
    }
  };

  const handleZoomIn = useCallback(() => {
    if (!containerRef.current) return;
    
    const newScale = Math.min(scale * 1.1, 5);
    const rect = containerRef.current.getBoundingClientRect();
    
    // Use center of viewport as zoom point for button clicks
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate the world position under center before zoom
    const worldX = (centerX - position.x) / scale;
    const worldY = (centerY - position.y) / scale;
    
    // Calculate new position to keep the center point fixed
    const newPosition = {
      x: centerX - worldX * newScale,
      y: centerY - worldY * newScale
    };
    
    setScale(newScale);
    setPosition(newPosition);
    debouncedUpdateViewConfig({ zoom: newScale, position: newPosition });
  }, [scale, position, debouncedUpdateViewConfig]);

  const handleZoomOut = useCallback(() => {
    if (!containerRef.current) return;
    
    const newScale = Math.max(scale * 0.9, 0.1);
    const rect = containerRef.current.getBoundingClientRect();
    
    // Use center of viewport as zoom point for button clicks
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate the world position under center before zoom
    const worldX = (centerX - position.x) / scale;
    const worldY = (centerY - position.y) / scale;
    
    // Calculate new position to keep the center point fixed
    const newPosition = {
      x: centerX - worldX * newScale,
      y: centerY - worldY * newScale
    };
    
    setScale(newScale);
    setPosition(newPosition);
    debouncedUpdateViewConfig({ zoom: newScale, position: newPosition });
  }, [scale, position, debouncedUpdateViewConfig]);

  const handleNavigateToPosition = useCallback((x: number, y: number) => {
    const targetPosition = {
      x: -x * scale,
      y: -y * scale
    };

    animateToPosition(targetPosition);
  }, [scale, animateToPosition]);

  const handleNavigateToNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const nodePosition = typeof node.position === 'string' 
      ? JSON.parse(node.position) 
      : node.position;

    const nodeDimensions = typeof node.dimensions === 'string'
      ? JSON.parse(node.dimensions)
      : node.dimensions;

    let targetX = -(nodePosition.x * scale);
    let targetY = -(nodePosition.y * scale);

    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      targetX += (width / 2) - (nodeDimensions.width * scale / 2);
      targetY += (height / 2) - (nodeDimensions.height * scale / 2);
    }

    animateToPosition({x: targetX, y: targetY});
  }, [nodes, scale, animateToPosition]);

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          "fixed inset-0 overflow-hidden bg-gray-100 dark:bg-gray-900",
          isDragging ? "cursor-grabbing" : "cursor-grab",
          "touch-none"
        )}
        style={{ 
          touchAction: "none",
          WebkitOverflowScrolling: "touch",
          willChange: isDragging ? "transform" : "auto"
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <CanvasControls 
          code={code || ''}
          canvasId={canvas?.id || ''}
          nodes={nodes}
          viewportBounds={viewportBounds}
          onAddNode={handleAddNode}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onCenterView={centerViewOnContent}
          scale={scale}
        />
        
        <NodeFinder 
          nodes={nodes} 
          onNavigateToNode={handleNavigateToNode}
          className="fixed top-4 right-4 sm:right-6 z-50 max-w-[calc(100vw-6rem)] sm:max-w-md"
        />
        
        {nodes.length > 0 && (
          <Minimap 
            nodes={nodes} 
            viewportBounds={viewportBounds} 
            onNavigate={handleNavigateToPosition} 
          />
        )}
        
        {/* Add LinkManager above the nodes */}
        {canvas?.id && (
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: "0 0",
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              zIndex: 15
            }}
          >
            <LinkManager 
              nodes={nodes} 
              canvasId={canvas.id} 
              scale={scale} 
            />
          </div>
        )}
        
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
          className="absolute top-0 left-0 will-change-transform"
        >
          <NodeList 
            nodes={nodes} 
            scale={scale} 
            viewportBounds={viewportBounds} 
          />
        </div>
      </div>
    </>
  );
};
