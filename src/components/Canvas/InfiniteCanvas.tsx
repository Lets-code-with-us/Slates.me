import { useCallback, useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useCanvas } from "@/hooks/useCanvas";
import { NodeList } from "./NodeList";
import { CanvasControls } from "./CanvasControls";
import { Minimap } from "./Minimap";
import { NodeFinder } from "./NodeFinder";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
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
    if (nodes.length > 0 && isInitialized) {
      if (!viewConfig && nodes.length > 0 && containerRef.current) {
        centerViewOnContent();
      }
    }
  }, [nodes, isInitialized, viewConfig]);

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

      toast({
        title: "Canvas centered",
        description: "View has been centered on canvas content",
        duration: 2000
      });
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
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(Math.max(scale * delta, 0.1), 5);
      setScale(newScale);
      debouncedUpdateViewConfig({ zoom: newScale, position });
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
    if (e.touches.length === 2) {
      e.preventDefault();
      const distance = calculateDistance(e.touches);
      setInitialPinchDistance(distance);
      setInitialScale(scale);
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ 
        x: e.touches[0].clientX - position.x, 
        y: e.touches[0].clientY - position.y 
      });
    }
  }, [position, scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 2 && initialPinchDistance !== null) {
      const currentDistance = calculateDistance(e.touches);
      const pinchRatio = currentDistance / initialPinchDistance;
      const newScale = Math.min(Math.max(initialScale * pinchRatio, 0.1), 5);
      setScale(newScale);
    } else if (e.touches.length === 1 && isDragging) {
      const newPosition = {
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      };
      setPosition(newPosition);
    }
  }, [initialPinchDistance, initialScale, isDragging, dragStart]);

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
    if (e.button === 0 && !e.ctrlKey && !e.metaKey) {
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

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      document.body.style.userSelect = '';
      debouncedUpdateViewConfig({ zoom: scale, position });
      setIsDragging(false);
    }
  }, [isDragging, scale, position, debouncedUpdateViewConfig]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      document.body.style.userSelect = '';
      debouncedUpdateViewConfig({ zoom: scale, position });
      setIsDragging(false);
    }
  }, [isDragging, scale, position, debouncedUpdateViewConfig]);

  const handleAddNode = async (nodeData: NodeData) => {
    try {
      if (!canvas?.id) {
        toast({
          title: "Error",
          description: "Canvas not found",
          variant: "destructive"
        });
        return;
      }

      const nodeForInsert = {
        ...nodeData,
        position: nodeData.position as any,
        dimensions: nodeData.dimensions as any,
        style: nodeData.style as any
      };

      const { data: node, error } = await supabase
        .from('nodes')
        .insert(nodeForInsert)
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Node created",
        description: `Successfully created ${nodeData.node_type} node`
      });
    } catch (error) {
      import('@/lib/error-handler').then(({ handleError }) => {
        handleError(error, {
          title: "Node Creation Failed",
          message: `Could not create ${nodeData.node_type} node`,
          action: "Please try again or refresh the page"
        });
      });
    }
  };

  const handleZoomIn = useCallback(() => {
    const newScale = Math.min(scale * 1.1, 5);
    setScale(newScale);
    debouncedUpdateViewConfig({ zoom: newScale, position });
  }, [scale, position, debouncedUpdateViewConfig]);

  const handleZoomOut = useCallback(() => {
    const newScale = Math.max(scale * 0.9, 0.1);
    setScale(newScale);
    debouncedUpdateViewConfig({ zoom: newScale, position });
  }, [scale, position, debouncedUpdateViewConfig]);

  useEffect(() => {
    if (nodes.length > 0) {
      // Only show a notification for a significant number of nodes
      if (nodes.length > 5) {
        toast({
          title: "Canvas loaded",
          description: `${nodes.length} elements found`,
          duration: 2000,
        });
      }
    }
  }, [nodes.length]);

  const handleNavigateToPosition = useCallback((x: number, y: number) => {
    const targetPosition = {
      x: -x * scale,
      y: -y * scale
    };

    animateToPosition(targetPosition);

    toast({
      title: "Navigated",
      description: "Moved to new position on canvas",
      duration: 2000
    });
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

    toast({
      title: `Navigated to ${node.node_type} node`,
      description: node.node_type === 'text' && node.content 
        ? `"${node.content.substring(0, 20)}${node.content.length > 20 ? '...' : ''}"` 
        : node.file_name || '',
      duration: 2000
    });
  }, [nodes, scale, animateToPosition]);

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          "h-screen w-screen overflow-hidden bg-gray-100 dark:bg-gray-900",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
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
        />
        
        {nodes.length > 0 && (
          <Minimap 
            nodes={nodes} 
            viewportBounds={viewportBounds} 
            onNavigate={handleNavigateToPosition} 
          />
        )}
        
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
          className="absolute top-0 left-0"
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
