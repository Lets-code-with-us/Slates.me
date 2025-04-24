
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
