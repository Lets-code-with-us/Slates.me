
import { useCallback, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useCanvas } from "@/hooks/useCanvas";
import { NodeList } from "./NodeList";
import { cn } from "@/lib/utils";

export const InfiniteCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const { code } = useParams();
  const { nodes, viewConfig, updateViewConfig } = useCanvas(code);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(Math.max(scale * delta, 0.1), 5);
      setScale(newScale);
      updateViewConfig({ zoom: newScale, position });
    } else {
      const newPosition = {
        x: position.x - e.deltaX,
        y: position.y - e.deltaY,
      };
      setPosition(newPosition);
      updateViewConfig({ zoom: scale, position: newPosition });
    }
  }, [scale, position, updateViewConfig]);

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
      updateViewConfig({ zoom: scale, position: newPosition });
    }
  }, [isDragging, dragStart, scale, updateViewConfig]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

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
