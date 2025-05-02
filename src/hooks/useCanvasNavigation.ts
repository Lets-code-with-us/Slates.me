
import { useCallback } from "react";
import { Node } from "@/types";
import { animate } from "@/lib/animation";

interface UseCanvasNavigationProps {
  containerRef: React.RefObject<HTMLDivElement>;
  nodes: Node[];
  scale: number;
  position: { x: number; y: number };
  setPosition: (position: { x: number; y: number }) => void;
  setScale: (scale: number) => void;
  updateViewConfig: (config: { zoom: number; position: { x: number; y: number } }) => void;
}

export const useCanvasNavigation = ({
  containerRef,
  nodes,
  scale,
  position,
  setPosition,
  setScale,
  updateViewConfig
}: UseCanvasNavigationProps) => {
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
        updateViewConfig({ 
          zoom: finalScale, 
          position: targetPosition 
        });
      }
    });
  }, [position, scale, setPosition, setScale, updateViewConfig]);

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
  }, [nodes, scale, containerRef, animateToPosition]);

  const navigateToPosition = useCallback((x: number, y: number) => {
    const targetPosition = {
      x: -x * scale,
      y: -y * scale
    };

    animateToPosition(targetPosition);
  }, [scale, animateToPosition]);

  const navigateToNode = useCallback((nodeId: string) => {
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
  }, [nodes, scale, containerRef, animateToPosition]);

  return {
    animateToPosition,
    centerViewOnContent,
    navigateToPosition,
    navigateToNode
  };
};
