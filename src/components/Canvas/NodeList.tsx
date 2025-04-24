
import { Node } from "@/types";
import { CanvasNode } from "./CanvasNode";

interface NodeListProps {
  nodes: Node[];
  scale: number;
}

export const NodeList = ({ nodes, scale }: NodeListProps) => {
  return (
    <>
      {nodes.map((node) => (
        <CanvasNode key={node.id} node={node} scale={scale} />
      ))}
    </>
  );
};
