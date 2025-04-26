import { useEffect, useRef, useState, useCallback } from "react";
import { Node } from "@/types";
import { cn } from "@/lib/utils";
import { Maximize2, Minimize2, Map, X } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [visible, setVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [canvasBounds, setCanvasBounds] = useState({
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0,
    width: 0,
    height: 0,
  });

  const [nodePositions, setNodePositions] = useState<Array<{
    node: Node;
    x: number;
    y: number;
    width: number;
    height: number;
  }>>([]);

  const drawMinimap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const newNodePositions: typeof nodePositions = [];

    const isDark = theme === "dark";
    ctx.fillStyle = isDark
      ? "rgba(17, 24, 39, 0.95)"
      : "rgba(249, 250, 251, 0.95)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const padding = 20;
    const contentWidth = canvasBounds.width;
    const contentHeight = canvasBounds.height;
    const scaleX = (canvas.width - padding * 2) / contentWidth;
    const scaleY = (canvas.height - padding * 2) / contentHeight;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (canvas.width - contentWidth * scale) / 2;
    const offsetY = (canvas.height - contentHeight * scale) / 2;

    nodes.forEach((node) => {
      const position =
        typeof node.position === "string"
          ? JSON.parse(node.position)
          : node.position;

      const dimensions =
        typeof node.dimensions === "string"
          ? JSON.parse(node.dimensions)
          : node.dimensions;

      const x = (position.x - canvasBounds.minX) * scale + offsetX;
      const y = (position.y - canvasBounds.minY) * scale + offsetY;
      const width = dimensions.width * scale;
      const height = dimensions.height * scale;

      newNodePositions.push({ node, x, y, width, height });

      let color;
      switch (node.node_type) {
        case "text":
          color = isDark
            ? "rgba(96, 165, 250, 0.9)"
            : "rgba(59, 130, 246, 0.8)";
          break;
        case "image":
          color = isDark
            ? "rgba(52, 211, 153, 0.9)"
            : "rgba(16, 185, 129, 0.8)";
          break;
        case "video":
          color = isDark
            ? "rgba(248, 113, 113, 0.9)"
            : "rgba(239, 68, 68, 0.8)";
          break;
        case "pdf":
          color = isDark
            ? "rgba(251, 191, 36, 0.9)"
            : "rgba(245, 158, 11, 0.8)";
          break;
        default:
          color = isDark
            ? "rgba(156, 163, 175, 0.9)"
            : "rgba(107, 114, 128, 0.8)";
      }

      ctx.fillStyle = color;
      const radius = Math.min(3, Math.min(width, height) / 2);
      if (width > 2 && height > 2) {
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
      }
    });

    setNodePositions(newNodePositions);

    const viewX = (viewportBounds.x - canvasBounds.minX) * scale + offsetX;
    const viewY = (viewportBounds.y - canvasBounds.minY) * scale + offsetY;
    const viewWidth = viewportBounds.width * scale;
    const viewHeight = viewportBounds.height * scale;

    ctx.strokeStyle = isDark
      ? "rgba(255, 255, 255, 0.9)"
      : "rgba(0, 0, 0, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(viewX, viewY, viewWidth, viewHeight);

    ctx.fillStyle = isDark
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(viewX, viewY, viewWidth, viewHeight);
  }, [nodes, canvasBounds, viewportBounds, theme]);

  useEffect(() => {
    const shouldHideMinimap = nodes.some(
      (node) => "keep_minimap_hidden" in node && node.keep_minimap_hidden
    );
    if (shouldHideMinimap) {
      setVisible(false);
    }
  }, [nodes]);

  useEffect(() => {
    if (nodes.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach((node) => {
      const position =
        typeof node.position === "string"
          ? JSON.parse(node.position)
          : node.position;

      const dimensions =
        typeof node.dimensions === "string"
          ? JSON.parse(node.dimensions)
          : node.dimensions;

      minX = Math.min(minX, position.x);
      minY = Math.min(minY, position.y);
      maxX = Math.max(maxX, position.x + dimensions.width);
      maxY = Math.max(maxY, position.y + dimensions.height);
    });

    const paddingX = (maxX - minX) * 0.1;
    const paddingY = (maxY - minY) * 0.1;
    minX -= paddingX;
    minY -= paddingY;
    maxX += paddingX;
    maxY += paddingY;

    setCanvasBounds({
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    });
  }, [nodes]);

  useEffect(() => {
    const updateCanvasSize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const container = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = container.width;
      canvasRef.current.height = container.height;
      drawMinimap();
    };

    window.addEventListener("resize", updateCanvasSize);
    updateCanvasSize();

    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [expanded]);

  useEffect(() => {
    if (visible && containerRef.current && canvasRef.current) {
      const container = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = container.width;
      canvasRef.current.height = container.height;
      drawMinimap();
    }
  }, [visible, drawMinimap]);

  const handleMinimapClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      for (const nodePos of nodePositions) {
        if (
          x >= nodePos.x &&
          x <= nodePos.x + nodePos.width &&
          y >= nodePos.y &&
          y <= nodePos.y + nodePos.height
        ) {
          const position =
            typeof nodePos.node.position === "string"
              ? JSON.parse(nodePos.node.position)
              : nodePos.node.position;

          const dimensions =
            typeof nodePos.node.dimensions === "string"
              ? JSON.parse(nodePos.node.dimensions)
              : nodePos.node.dimensions;

          const centerX = position.x + dimensions.width / 2;
          const centerY = position.y + dimensions.height / 2;

          onNavigate(centerX, centerY);
          return;
        }
      }

      const padding = 20;
      const contentWidth = canvasBounds.width;
      const contentHeight = canvasBounds.height;
      const scaleX = (canvasRef.current.width - padding * 2) / contentWidth;
      const scaleY = (canvasRef.current.height - padding * 2) / contentHeight;
      const scale = Math.min(scaleX, scaleY);

      const offsetX = (canvasRef.current.width - contentWidth * scale) / 2;
      const offsetY = (canvasRef.current.height - contentHeight * scale) / 2;

      const canvasX = (x - offsetX) / scale + canvasBounds.minX;
      const canvasY = (y - offsetY) / scale + canvasBounds.minY;

      onNavigate(canvasX, canvasY);
    },
    [canvasBounds, onNavigate, nodePositions]
  );

  useEffect(() => {
    drawMinimap();
  }, [drawMinimap, expanded, theme]);

  return (
    <>
      <Button
        onClick={() => setVisible(!visible)}
        className={cn(
          "fixed z-50 p-2 rounded-full shadow-md hover:bg-accent/80 transition-all duration-200 h-auto w-auto",
          isMobile ? "bottom-20 right-4" : "bottom-4 right-4"
        )}
        size="sm"
        variant={visible ? "default" : "outline"}
        title={visible ? "Hide minimap" : "Show minimap"}
      >
        <Map
          size={16}
          className={visible ? "text-primary-foreground" : "text-muted-foreground"}
        />
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
              "fixed bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border overflow-hidden z-50",
              "transition-all duration-300 ease-in-out",
              isMobile ? "bottom-24 right-4" : "bottom-4 right-4",
              expanded ? "w-[280px] h-[210px]" : "w-[180px] h-[135px]"
            )}
            onAnimationComplete={() => {
              if (canvasRef.current) {
                const container = containerRef.current?.getBoundingClientRect();
                if (container) {
                  canvasRef.current.width = container.width;
                  canvasRef.current.height = container.height;
                  drawMinimap();
                }
              }
            }}
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

            <canvas
              ref={canvasRef}
              onClick={handleMinimapClick}
              className="w-full h-full touch-none"
              style={{ display: "block" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};