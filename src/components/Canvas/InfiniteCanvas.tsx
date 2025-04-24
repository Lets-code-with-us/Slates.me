
import { useCallback, useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useCanvas } from "@/hooks/useCanvas";
import { NodeList } from "./NodeList";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export const InfiniteCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const { code } = useParams();
  const { nodes, viewConfig, updateViewConfig } = useCanvas(code);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize position and scale from viewConfig when available
  useEffect(() => {
    if (viewConfig && !isInitialized) {
      setScale(viewConfig.zoom);
      setPosition(viewConfig.position);
      setIsInitialized(true);
    }
  }, [viewConfig, isInitialized]);

  // Debounce the updateViewConfig call to prevent excessive database updates
  const debouncedUpdateViewConfig = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (config: { zoom: number; position: { x: number; y: number } }) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          updateViewConfig(config);
        }, 1000); // Only update after 1 second of inactivity
      };
    })(),
    [updateViewConfig]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && !e.ctrlKey && !e.metaKey) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const newPosition = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      };
      setPosition(newPosition);
      // Don't update the database on every mouse move - only use the debounced version
    }
  }, [isDragging, dragStart]);

  // Save position when drag ends
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      debouncedUpdateViewConfig({ zoom: scale, position });
      setIsDragging(false);
    }
  }, [isDragging, scale, position, debouncedUpdateViewConfig]);

  // Show a toast when canvas loads
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
        "h-screen w-screen overflow-hidden bg-background cursor-grab",
        isDragging && "cursor-grabbing"
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
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
