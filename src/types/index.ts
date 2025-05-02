export interface Node {
  id: string;
  canvas_id: string;
  node_type: 'text' | 'image' | 'video' | 'pdf';
  content?: string;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  style?: Record<string, unknown>;
  file_path?: string;
  file_type?: string;
  file_name?: string;
  created_at: string;
  updated_at: string;
  keep_minimap_hidden?: boolean;
}

// Type for creating new nodes (subset of Node without id and timestamps)
export interface NodeData {
  canvas_id: string;
  node_type: 'text' | 'image' | 'video' | 'pdf' | 'file';
  content?: string;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  style?: Record<string, unknown>;
  file_path?: string;
  file_type?: string;
  file_name?: string;
  keep_minimap_hidden?: boolean;
}

export interface ViewConfig {
  zoom: number;
  position: { x: number; y: number };
}

export interface Canvas {
  id: string;
  code: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  view_config: ViewConfig;
}
