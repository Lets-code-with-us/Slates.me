
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Node } from "@/types";

interface Link {
  id: string;
  source_node_id: string;
  target_node_id: string;
  canvas_id: string;
  link_type: string;
  label: string;
  style: any;
  created_at: string;
}

interface LinkManagerProps {
  nodes: Node[];
  canvasId: string;
  scale: number;
}

export const LinkManager = ({ nodes, canvasId, scale }: LinkManagerProps) => {
  const [links, setLinks] = useState<Link[]>([]);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [sourceNodeId, setSourceNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Fetch existing links when canvas ID changes
    if (!canvasId) return;
    
    const fetchLinks = async () => {
      try {
        const { data, error } = await supabase
          .from('node_links')
          .select('*')
          .eq('canvas_id', canvasId);
        
        if (error) throw error;
        setLinks(data || []);
      } catch (error) {
        console.error('Error fetching links:', error);
      }
    };
    
    fetchLinks();
    
    // Set up subscription for real-time updates
    const channel = supabase
      .channel('link-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'node_links',
          filter: `canvas_id=eq.${canvasId}`,
        },
        () => {
          fetchLinks();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [canvasId]);

  useEffect(() => {
    // Add global link creation mode listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        setIsCreatingLink(prev => !prev);
        if (!isCreatingLink) {
          toast({
            title: "Link Creation Mode",
            description: "Click on a node to start creating a link"
          });
        } else {
          setSourceNodeId(null);
          toast({
            title: "Link Creation Cancelled",
            description: "Exited link creation mode"
          });
        }
      }
      
      // Cancel with Escape
      if (e.key === 'Escape' && isCreatingLink) {
        setIsCreatingLink(false);
        setSourceNodeId(null);
        toast({
          title: "Link Creation Cancelled",
          description: "Exited link creation mode"
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCreatingLink]);

  useEffect(() => {
    // Add node click listeners for link creation
    const handleNodeClick = (e: MouseEvent) => {
      if (!isCreatingLink) return;
      
      const target = e.target as HTMLElement;
      const nodeElement = target.closest('[id^="node-"]');
      
      if (!nodeElement) return;
      
      const nodeId = nodeElement.id.replace('node-', '');
      
      if (!sourceNodeId) {
        setSourceNodeId(nodeId);
        toast({
          title: "Source Node Selected",
          description: "Now click on a target node to create a link"
        });
      } else if (nodeId !== sourceNodeId) {
        // Create the link
        createLink(sourceNodeId, nodeId);
        setIsCreatingLink(false);
        setSourceNodeId(null);
      }
    };
    
    document.addEventListener('click', handleNodeClick);
    return () => {
      document.removeEventListener('click', handleNodeClick);
    };
  }, [isCreatingLink, sourceNodeId]);

  const createLink = async (sourceId: string, targetId: string) => {
    try {
      const newLink = {
        canvas_id: canvasId,
        source_node_id: sourceId,
        target_node_id: targetId,
        link_type: 'arrow',
        label: '',
        style: { stroke: '#6366f1', strokeWidth: 2, dashed: false }
      };
      
      const { error } = await supabase
        .from('node_links')
        .insert(newLink);
      
      if (error) throw error;
      
      toast({
        title: "Link Created",
        description: "Nodes have been connected successfully"
      });
    } catch (error) {
      toast({
        title: "Link Creation Failed",
        description: "Could not create connection between nodes",
        variant: "destructive"
      });
      console.error('Error creating link:', error);
    }
  };

  const deleteLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('node_links')
        .delete()
        .eq('id', linkId);
      
      if (error) throw error;
      
      toast({
        title: "Link Deleted",
        description: "Connection removed successfully"
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Could not remove the connection",
        variant: "destructive"
      });
    }
  };

  const getNodeCenter = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    
    const position = typeof node.position === 'string' 
      ? JSON.parse(node.position) 
      : node.position;
      
    const dimensions = typeof node.dimensions === 'string'
      ? JSON.parse(node.dimensions)
      : node.dimensions;
    
    return {
      x: position.x + dimensions.width / 2,
      y: position.y + dimensions.height / 2
    };
  };

  const drawArrow = (sourceCenter: {x: number, y: number}, targetCenter: {x: number, y: number}, style: any) => {
    const dx = targetCenter.x - sourceCenter.x;
    const dy = targetCenter.y - sourceCenter.y;
    const angle = Math.atan2(dy, dx);
    
    // Calculate the distance between centers
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Make arrows start and end at node borders (estimated as a percentage of distance)
    const buffer = Math.min(30, length * 0.2); // Buffer from node borders
    
    // Calculate start and end points with buffer
    const startX = sourceCenter.x + Math.cos(angle) * buffer;
    const startY = sourceCenter.y + Math.sin(angle) * buffer;
    const endX = targetCenter.x - Math.cos(angle) * buffer;
    const endY = targetCenter.y - Math.sin(angle) * buffer;
    
    // Calculate arrow head points
    const arrowSize = 12;
    const arrowAngle = 0.5; // Angle of arrow head in radians
    
    const arrowPoint1X = endX - arrowSize * Math.cos(angle - arrowAngle);
    const arrowPoint1Y = endY - arrowSize * Math.sin(angle - arrowAngle);
    const arrowPoint2X = endX - arrowSize * Math.cos(angle + arrowAngle);
    const arrowPoint2Y = endY - arrowSize * Math.sin(angle + arrowAngle);
    
    // Create path
    const path = `M${startX},${startY} L${endX},${endY}`;
    const arrowHead = `M${endX},${endY} L${arrowPoint1X},${arrowPoint1Y} L${arrowPoint2X},${arrowPoint2Y} Z`;
    
    return {
      path,
      arrowHead,
      midX: (startX + endX) / 2,
      midY: (startY + endY) / 2,
      style
    };
  };

  if (nodes.length === 0 || links.length === 0) return null;

  return (
    <svg 
      ref={svgRef}
      className="absolute top-0 left-0 pointer-events-none z-10"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
    >
      {links.map(link => {
        const sourceNode = nodes.find(n => n.id === link.source_node_id);
        const targetNode = nodes.find(n => n.id === link.target_node_id);
        
        if (!sourceNode || !targetNode) return null;
        
        const sourceCenter = getNodeCenter(link.source_node_id);
        const targetCenter = getNodeCenter(link.target_node_id);
        const { path, arrowHead, midX, midY, style } = drawArrow(sourceCenter, targetCenter, link.style);
        
        return (
          <g key={link.id} className="link-group">
            {/* Link line */}
            <path
              d={path}
              stroke={link.style?.stroke || "#6366f1"}
              strokeWidth={(link.style?.strokeWidth || 2) / scale}
              strokeDasharray={link.style?.dashed ? "5,5" : "none"}
              fill="none"
              markerEnd="url(#arrowhead)"
            />
            
            {/* Arrow head */}
            <path
              d={arrowHead}
              fill={link.style?.stroke || "#6366f1"}
            />
            
            {/* Link label */}
            {link.label && (
              <text
                x={midX}
                y={midY - 10 / scale}
                textAnchor="middle"
                className="text-xs fill-current"
                style={{ fontSize: `${14 / scale}px` }}
              >
                {link.label}
              </text>
            )}
            
            {/* Invisible wider path for click detection */}
            <path
              d={path}
              stroke="transparent"
              strokeWidth={(link.style?.strokeWidth || 2) * 5 / scale}
              fill="none"
              style={{ pointerEvents: "stroke", cursor: "pointer" }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                deleteLink(link.id);
              }}
            />
          </g>
        );
      })}
    </svg>
  );
};
