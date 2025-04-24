
import { Node } from "@/types";
import { cn } from "@/lib/utils";
import { FilePreview } from "./FilePreview";

interface CanvasNodeProps {
  node: Node;
  scale: number;
}

export const CanvasNode = ({ node, scale }: CanvasNodeProps) => {
  const position = typeof node.position === 'string' ? JSON.parse(node.position) : node.position;
  const dimensions = typeof node.dimensions === 'string' ? JSON.parse(node.dimensions) : node.dimensions;

  return (
    <div
      className="absolute bg-card rounded-lg shadow-sm border"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        width: dimensions.width,
        height: dimensions.height,
      }}
    >
      {node.node_type === 'text' && (
        <div className="p-4">
          <p className="text-sm text-card-foreground whitespace-pre-wrap">{node.content}</p>
        </div>
      )}
      {(node.node_type === 'image' || node.node_type === 'video' || node.node_type === 'pdf') && (
        <FilePreview node={node} />
      )}
    </div>
  );
};
