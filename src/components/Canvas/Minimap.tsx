import { useEffect, useRef, useState } from "react";
import { Node } from "@/types";
import { cn } from "@/lib/utils";
import { Maximize2, Minimize2, Map, X } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface MinimapProps {
  nodes: Node[];
  viewportBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  onNavigate: (x: number, y: number) => void;
}

export const Minimap = ({ nodes, viewportBounds, onNavigate }: MinimapProps) => {
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [canvasBounds, setCanvasBounds] = useState({ 
    minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 
  });
  const mapScale = 0.1; // Scale factor for the minimap
  
  // Calculate the bounds of all nodes to determine canvas size
  useEffect(() => {
    if (nodes.length === 0) return;
    
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
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
    
    // Add some padding
    const padding = 100;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    setCanvasBounds({
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    });
  }, [nodes]);
  
  // Draw the minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    const isDark = theme === 'dark';
    ctx.fillStyle = isDark ? 'rgba(31, 41, 55, 0.9)' : 'rgba(243, 244, 246, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    const gridSize = 100 * mapScale; // 100px in canvas = 10px in minimap
    const gridColor = isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.7)';
    
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    
    // Draw vertical grid lines
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // Draw horizontal grid lines
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // Draw each node
    nodes.forEach(node => {
      const position = typeof node.position === 'string' 
        ? JSON.parse(node.position) 
        : node.position;
      
      const dimensions = typeof node.dimensions === 'string'
        ? JSON.parse(node.dimensions)
        : node.dimensions;
      
      // Calculate position relative to canvas bounds
      const x = (position.x - canvasBounds.minX) * mapScale;
      const y = (position.y - canvasBounds.minY) * mapScale;
      const width = dimensions.width * mapScale;
      const height = dimensions.height * mapScale;
      
      // Set color based on node type and improve visibility
      let color;
      switch (node.node_type) {
        case 'text':
          color = isDark ? 'rgba(96, 165, 250, 0.8)' : 'rgba(59, 130, 246, 0.7)'; // blue
          break;
        case 'image':
          color = isDark ? 'rgba(52, 211, 153, 0.8)' : 'rgba(16, 185, 129, 0.7)'; // green
          break;
        case 'video':
          color = isDark ? 'rgba(248, 113, 113, 0.8)' : 'rgba(239, 68, 68, 0.7)'; // red
          break;
        case 'pdf':
          color = isDark ? 'rgba(251, 191, 36, 0.8)' : 'rgba(245, 158, 11, 0.7)'; // amber
          break;
        default:
          color = isDark ? 'rgba(156, 163, 175, 0.8)' : 'rgba(107, 114, 128, 0.7)'; // gray
      }
      
      // Draw the node with rounded corners for a modern look
      ctx.fillStyle = color;
      
      // Implement rounded corners for nodes
      const radius = 1;  // Small radius for rounded corners
      if (width > 2 && height > 2) {  // Only round corners if node is big enough
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
      } else {
        // Fall back to rectangle for tiny nodes
        ctx.fillRect(x, y, width, height);
      }
    });
    
    // Draw viewport with improved visibility
    const viewX = (viewportBounds.x - canvasBounds.minX) * mapScale;
    const viewY = (viewportBounds.y - canvasBounds.minY) * mapScale;
    const viewWidth = viewportBounds.width * mapScale;
    const viewHeight = viewportBounds.height * mapScale;
    
    // Draw viewport rectangle with a more visible but semi-transparent outline
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 1.5;
    
    // Add dash pattern for better visibility
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(viewX, viewY, viewWidth, viewHeight);
    ctx.setLineDash([]);
    
    // Add a semi-transparent fill to make the viewport area more visible
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';
    ctx.fillRect(viewX, viewY, viewWidth, viewHeight);
    
  }, [nodes, canvasBounds, viewportBounds, mapScale, theme]);
  
  // Handle click on minimap to navigate
  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert minimap coordinates to canvas coordinates
    const canvasX = (x / mapScale) + canvasBounds.minX;
    const canvasY = (y / mapScale) + canvasBounds.minY;
    
    // Center the viewport on the clicked point
    const centerX = canvasX - (viewportBounds.width / 2);
    const centerY = canvasY - (viewportBounds.height / 2);
    
    onNavigate(centerX, centerY);
  };

  return (
    <>
      {/* Toggle minimap button */}
      <Button
        onClick={() => setVisible(!visible)}
        className="fixed bottom-4 right-4 z-50 p-2 rounded-full shadow-md hover:bg-accent/80 transition-all duration-200 h-auto w-auto"
        size="sm"
        variant={visible ? "default" : "outline"}
        title={visible ? "Hide minimap" : "Show minimap"}
      >
        <Map size={16} className={visible ? "text-primary-foreground" : "text-muted-foreground"} />
      </Button>
      
      <AnimatePresence>
        {visible && (
          <motion.div 
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed bottom-14 right-4 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border overflow-hidden z-50",
              expanded ? "w-72 h-54" : "w-40 h-30",
              "transition-all duration-300 ease-in-out"
            )}
          >
            <div className="absolute top-1 right-1 z-10 flex gap-1">
              <Button
                onClick={() => setExpanded(!expanded)}
                size="icon"
                variant="ghost"
                className="h-6 w-6 rounded-full bg-background/80 hover:bg-background"
                title={expanded ? "Collapse" : "Expand"}
              >
                {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </Button>
              
              <Button
                onClick={() => setVisible(false)}
                size="icon"
                variant="ghost"
                className="h-6 w-6 rounded-full bg-background/80 hover:bg-background hover:text-destructive"
                title="Close minimap"
              >
                <X size={12} />
              </Button>
            </div>
            
            <div 
              className="relative cursor-pointer overflow-hidden" 
              style={{ 
                width: canvasBounds.width * mapScale,
                height: canvasBounds.height * mapScale,
                maxWidth: expanded ? "100%" : "100%",
                maxHeight: expanded ? "100%" : "100%"
              }}
            >
              <canvas
                ref={canvasRef}
                width={canvasBounds.width * mapScale}
                height={canvasBounds.height * mapScale}
                onClick={handleMinimapClick}
                className="cursor-crosshair"
                title="Click to navigate to a location"
              />
            </div>
            
            <div className="absolute bottom-1 left-1 text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
              {nodes.length} {nodes.length === 1 ? 'item' : 'items'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};