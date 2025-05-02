
import { useCallback, useRef, useState, useEffect } from "react";
import { useCanvas } from "@/hooks/useCanvas";
import { CanvasControls } from "./CanvasControls";
import { Minimap } from "./Minimap";
import { NodeFinder } from "./NodeFinder";
import { CanvasContainer } from "./CanvasContainer";
import { TextEditorOverlay } from "./TextEditorOverlay";
import { Node } from "@/types";
import { useTextEditor } from "@/hooks/useTextEditor";
import { useCanvasNavigation } from "@/hooks/useCanvasNavigation";
import { useNodeManagement } from "@/hooks/useNodeManagement";
import { useCanvasInteraction } from "@/hooks/useCanvasInteraction";

interface InfiniteCanvasProps {
  code?: string;
}

export const InfiniteCanvas = ({ code = '' }: InfiniteCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastActiveTextNodeId, setLastActiveTextNodeId] = useState<string | null>(null);
  
  // Get canvas data and nodes
  const { nodes, canvas, viewConfig, updateViewConfig } = useCanvas(code);
  const [isInitialized, setIsInitialized] = useState(false);
  const [viewportBounds, setViewportBounds] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Initialize canvas navigation
  const { 
    animateToPosition, 
    centerViewOnContent, 
    navigateToPosition, 
    navigateToNode 
  } = useCanvasNavigation({
    containerRef,
    nodes,
    scale,
    position,
    setPosition,
    setScale,
    updateViewConfig
  });

  // Initialize node management
  const { handleAddNode } = useNodeManagement({
    canvasId: canvas?.id || '',
    containerRef,
    scale,
    animateToPosition
  });

  // Initialize the text editor hook
  const textEditor = useTextEditor(canvas?.id || '', (newNode) => {
    if (newNode && containerRef.current) {
      // Navigate to the newly created node
      navigateToNode(newNode.id);
    }
  });

  // Handle canvas click for creating new text nodes
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Only handle clicks directly on the canvas element, not on nodes or controls
    if (e.target !== e.currentTarget) return;
    
    if (canvas?.id) {
      // Calculate the world position based on the click coordinates
      const worldX = (e.clientX - position.x) / scale;
      const worldY = (e.clientY - position.y) / scale;
      
      textEditor.startNewTextNode({ x: worldX, y: worldY });
    }
  }, [canvas?.id, position, scale, textEditor]);
  
  // Handle double-click on existing text node
  const handleNodeDoubleClick = useCallback((node: Node) => {
    if (node.node_type === 'text') {
      textEditor.editExistingNode(node);
    }
  }, [textEditor]);

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
          navigateToNode(lastNode.id);
        } else {
          centerViewOnContent();
        }
      } else if (!viewConfig) {
        centerViewOnContent();
      }
    }
  }, [nodes, isInitialized, lastActiveTextNodeId, viewConfig, navigateToNode, centerViewOnContent]);

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

  const handleZoomIn = useCallback(() => {
    if (containerRef.current) {
      const canvasInteraction = useCanvasInteraction({
        containerRef,
        scale,
        position,
        updateViewConfig
      });
      
      const result = canvasInteraction.handleZoomIn();
      if (result && 'newScale' in result && 'newPosition' in result) {
        setScale(result.newScale);
        setPosition(result.newPosition);
      }
    }
  }, [scale, position, updateViewConfig]);

  const handleZoomOut = useCallback(() => {
    if (containerRef.current) {
      const canvasInteraction = useCanvasInteraction({
        containerRef,
        scale,
        position,
        updateViewConfig
      });
      
      const result = canvasInteraction.handleZoomOut();
      if (result && 'newScale' in result && 'newPosition' in result) {
        setScale(result.newScale);
        setPosition(result.newPosition);
      }
    }
  }, [scale, position, updateViewConfig]);

  return (
    <>
      <CanvasContainer
        nodes={nodes}
        scale={scale}
        position={position}
        setPosition={setPosition}
        setScale={setScale}
        isDragging={isDragging}
        viewportBounds={viewportBounds}
        updateViewConfig={updateViewConfig}
        onCanvasClick={handleCanvasClick}
        onNodeDoubleClick={handleNodeDoubleClick}
      >
        <CanvasControls 
          code={code}
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
          onNavigateToNode={navigateToNode}
          className="fixed top-4 right-4 sm:right-6 z-50 max-w-[calc(100vw-6rem)] sm:max-w-md"
        />
        
        {nodes.length > 0 && (
          <Minimap 
            nodes={nodes} 
            viewportBounds={viewportBounds} 
            onNavigate={navigateToPosition} 
          />
        )}
      </CanvasContainer>

      {/* Text editor overlay */}
      <TextEditorOverlay
        isEditing={textEditor.isEditing}
        editingNode={textEditor.editingNode}
        editorPosition={textEditor.editorPosition}
        editorDimensions={textEditor.editorDimensions}
        scale={scale}
        position={position}
        canvasId={canvas?.id || ''}
        onSubmit={textEditor.handleSubmit}
        onCancel={textEditor.handleCancel}
      />
    </>
  );
};
