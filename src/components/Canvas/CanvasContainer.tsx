
import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { NodeList } from './NodeList';
import { useCanvasInteraction } from '@/hooks/useCanvasInteraction';
import { Node } from '@/types';

interface CanvasContainerProps {
  nodes: Node[];
  scale: number;
  position: { x: number; y: number };
  setPosition: (position: { x: number; y: number }) => void;
  setScale: (scale: number) => void;
  isDragging: boolean;
  viewportBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  updateViewConfig: (config: { zoom: number; position: { x: number; y: number } }) => void;
  onCanvasClick: (e: React.MouseEvent) => void;
  onNodeDoubleClick: (node: Node) => void;
  children?: React.ReactNode;
}

export const CanvasContainer = ({
  nodes,
  scale,
  position,
  setPosition,
  setScale,
  isDragging,
  viewportBounds,
  updateViewConfig,
  onCanvasClick,
  onNodeDoubleClick,
  children
}: CanvasContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave
  } = useCanvasInteraction({
    containerRef,
    scale,
    position,
    updateViewConfig
  });

  // Handle wheel event
  const onWheel = (e: React.WheelEvent) => {
    const result = handleWheel(e);
    if (result && 'newScale' in result && 'newPosition' in result) {
      setScale(result.newScale);
      setPosition(result.newPosition);
    }
  };

  // Handle touch move with state updates
  const onTouchMove = (e: React.TouchEvent) => {
    const result = handleTouchMove(e);
    if (result && 'newScale' in result && 'newPosition' in result) {
      setScale(result.newScale);
      setPosition(result.newPosition);
    }
  };

  // Handle mouse move with state updates
  const onMouseMove = (e: React.MouseEvent) => {
    const result = handleMouseMove(e);
    if (result && 'newPosition' in result) {
      setPosition(result.newPosition);
    }
  };

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

  return (
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
      onClick={onCanvasClick}
      onWheel={onWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
      
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
          onNodeDoubleClick={onNodeDoubleClick}
        />
      </div>
    </div>
  );
};
