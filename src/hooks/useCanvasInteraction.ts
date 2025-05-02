import { useState, useCallback, RefObject } from "react";

interface UseCanvasInteractionProps {
  containerRef: RefObject<HTMLDivElement>;
  scale: number;
  position: { x: number; y: number };
  updateViewConfig: (config: { zoom: number; position: { x: number; y: number } }) => void;
}

interface PositionScale {
  newPosition: { x: number; y: number };
  newScale: number;
}

interface PositionOnly {
  newPosition: { x: number; y: number };
  newScale?: never;
}

type InteractionResult = PositionScale | PositionOnly | null;

interface CanvasInteractionResult {
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
  dragStart: { x: number; y: number };
  setDragStart: (dragStart: { x: number; y: number }) => void;
  initialPinchDistance: number | null;
  setInitialPinchDistance: (distance: number | null) => void;
  initialScale: number;
  setInitialScale: (scale: number) => void;
  handleWheel: (e: React.WheelEvent) => InteractionResult;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => InteractionResult;
  handleTouchEnd: () => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => InteractionResult;
  handleMouseUp: () => void;
  handleMouseLeave: () => void;
  handleZoomIn: () => InteractionResult;
  handleZoomOut: () => InteractionResult;
}

export const useCanvasInteraction = ({
  containerRef,
  scale,
  position,
  updateViewConfig
}: UseCanvasInteractionProps): CanvasInteractionResult => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialScale, setInitialScale] = useState<number>(1);

  const calculateDistance = (touches: React.TouchList) => {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  };

  const debouncedUpdateViewConfig = useCallback(
    (() => {
      let uiTimeoutId: NodeJS.Timeout;
      let dbTimeoutId: NodeJS.Timeout;
      
      return (config: { zoom: number; position: { x: number; y: number } }) => {
        // Clear existing timeouts
        clearTimeout(uiTimeoutId);
        clearTimeout(dbTimeoutId);
        
        // Persist to database with longer delay (1.5s)
        dbTimeoutId = setTimeout(() => {
          updateViewConfig(config);
        }, 1500);
      };
    })(),
    [updateViewConfig]
  );

  const handleWheel = useCallback((e: React.WheelEvent): InteractionResult => {
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
        
        debouncedUpdateViewConfig({ zoom: newScale, position: newPosition });
        return { newScale, newPosition };
      }
    } else {
      const newPosition = {
        x: position.x - e.deltaX,
        y: position.y - e.deltaY,
      };
      debouncedUpdateViewConfig({ zoom: scale, position: newPosition });
      return { newPosition };
    }
    
    return null;
  }, [scale, position, containerRef, debouncedUpdateViewConfig]);

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

  const handleTouchMove = useCallback((e: React.TouchEvent): InteractionResult => {
    if (e.touches.length === 2 && initialPinchDistance !== null) {
      e.preventDefault();
      const currentDistance = calculateDistance(e.touches);
      const pinchRatio = currentDistance / initialPinchDistance;
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
      
      return { newScale, newPosition };
    } else if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      const newPosition = {
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      };
      return { newPosition };
    }
    
    return null;
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

  const handleMouseMove = useCallback((e: React.MouseEvent): InteractionResult => {
    if (isDragging) {
      e.preventDefault();
      const newPosition = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      };
      return { newPosition };
    }
    return null;
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
      // Add a global mouse up listener to handle cases where the mouse leaves the window
      document.addEventListener('mouseup', () => {
        document.body.style.userSelect = '';
        debouncedUpdateViewConfig({ zoom: scale, position });
        setIsDragging(false);
      }, { once: true });
    }
  }, [isDragging, scale, position, debouncedUpdateViewConfig]);

  const handleZoomIn = useCallback((): InteractionResult => {
    if (!containerRef.current) return null;
    
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
    
    debouncedUpdateViewConfig({ zoom: newScale, position: newPosition });
    return { newScale, newPosition };
  }, [scale, position, containerRef, debouncedUpdateViewConfig]);

  const handleZoomOut = useCallback((): InteractionResult => {
    if (!containerRef.current) return null;
    
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
    
    debouncedUpdateViewConfig({ zoom: newScale, position: newPosition });
    return { newScale, newPosition };
  }, [scale, position, containerRef, debouncedUpdateViewConfig]);

  return {
    isDragging,
    setIsDragging,
    dragStart,
    setDragStart,
    initialPinchDistance,
    setInitialPinchDistance,
    initialScale,
    setInitialScale,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleZoomIn,
    handleZoomOut,
  };
};
