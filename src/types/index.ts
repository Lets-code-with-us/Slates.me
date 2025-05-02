
import { Database } from '@/integrations/supabase/types';

// Convenience type for node positions
export type Position = {
  x: number;
  y: number;
};

// Convenience type for node dimensions
export type Dimensions = {
  width: number;
  height: number;
};

// View configuration for a canvas (zoom level and position)
export type ViewConfig = {
  zoom: number;
  position: Position;
};

// Style information for a node
export type NodeStyle = {
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  [key: string]: any;
};

// Node data structure
export type Node = {
  id: string;
  canvas_id: string;
  node_type: 'text' | 'image' | 'video' | 'pdf';
  content?: string | null;
  position: Position | string;
  dimensions: Dimensions | string;
  file_path?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  style?: NodeStyle | string | null;
  created_at?: string;
  updated_at?: string | null;
  [key: string]: any;
};

// Data structure for creating a new node
export type NodeData = {
  node_type: Node['node_type'];
  content?: string;
  position: Position;
  dimensions: Dimensions;
  file_path?: string;
  file_name?: string;
  file_type?: string;
  style?: NodeStyle;
  keep_minimap_hidden?: boolean;
};

// Link between nodes
export type NodeLink = {
  id: string;
  canvas_id: string;
  source_node_id: string;
  target_node_id: string;
  link_type: string;
  label?: string;
  style?: {
    stroke: string;
    strokeWidth: number;
    dashed: boolean;
    [key: string]: any;
  };
  created_at?: string;
  updated_at?: string | null;
};

export type Canvas = {
  id: string;
  code: string;
  view_config?: ViewConfig | null;
  created_at?: string;
  updated_at?: string | null;
};
