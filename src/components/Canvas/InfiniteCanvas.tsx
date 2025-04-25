
import { useCallback, useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useCanvas } from "@/hooks/useCanvas";
import { NodeList } from "./NodeList";
import { CanvasControls } from "./CanvasControls";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const InfiniteCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const { code } = useParams();
  const { nodes, canvas, viewConfig, updateViewConfig } = useCanvas(code);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (viewConfig && !isInitialized) {
      setScale(viewConfig.zoom);
      setPosition(viewConfig.position);
      setIsInitialized(true);
    }
  }, [viewConfig, isInitialized]);

  // Prevent default zooming behavior on the whole page
  useEffect(() => {
    const preventDefaultZoom = (e: WheelEvent | TouchEvent) => {
      if ((e as WheelEvent).ctrlKey || 
          (e as TouchEvent).touches && (e as TouchEvent).touches.length > 1) {
        e.preventDefault();
      }
    };

    // Add event listeners to prevent default zoom
    document.addEventListener('wheel', preventDefaultZoom, { passive: false });
    document.addEventListener('touchmove', preventDefaultZoom, { passive: false });

    return () => {
      document.removeEventListener('wheel', preventDefaultZoom);
      document.removeEventListener('touchmove', preventDefaultZoom);
    };
  }, []);

  const debouncedUpdateViewConfig = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (config: { zoom: number; position: { x: number; y: number } }) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          updateViewConfig(config);
        }, 1000);
      };
    })(),
    [updateViewConfig]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault(); // Prevent default scrolling/zooming
    
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

  // Handle touch events for pinch-to-zoom
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
      // Pinch-to-zoom
      const currentDistance = calculateDistance(e.touches);
      const pinchRatio = currentDistance / initialPinchDistance;
      const newScale = Math.min(Math.max(initialScale * pinchRatio, 0.1), 5);
      setScale(newScale);
    } else if (e.touches.length === 1 && isDragging) {
      // Pan
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
      debouncedUpdateViewConfig({ zoom: scale, position });
      setIsDragging(false);
    }
  }, [isDragging, scale, position, debouncedUpdateViewConfig]);

  const handleAddNode = async (nodeData: any) => {
    try {
      if (!canvas?.id) {
        toast({
          title: "Error",
          description: "Canvas not found",
          variant: "destructive"
        });
        return;
      }
      
      const { data: node, error } = await supabase
        .from('nodes')
        .insert([nodeData])
        .select()
        .single();

      if (error) {
        console.error('Error creating node:', error);
        throw error;
      }

      toast({
        title: "Node created",
        description: `Successfully created ${nodeData.node_type} node`
      });
    } catch (error) {
      console.error('Error creating node:', error);
      toast({
        title: "Error",
        description: "Failed to create node",
        variant: "destructive"
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
      toast({
        title: "Canvas loaded",
        description: `${nodes.length} elements found`,
      });
    }
  }, [nodes.length]);

  return (
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
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <CanvasControls 
        code={code || ''}
        canvasId={canvas?.id || ''}
        onAddNode={handleAddNode}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />
      <div
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: "0 0",
        }}
        className="absolute top-0 left-0"
      >
        <NodeList nodes={nodes} scale={scale} />
      </div>
    </div>
  );
};
