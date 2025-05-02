// Define types for node position and dimensions
export type Position = { x: number; y: number };
export type Dimensions = { width: number; height: number };

// Define the ViewConfig type for canvas settings
export interface ViewConfig {
  zoom: number;
  position: Position;
}

// Define the Node interface for canvas elements
export interface Node {
  id: string;
  canvas_id: string;
  node_type: string;
  content?: string | null;
  position: Position | string;
  dimensions: Dimensions | string;
  file_path?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  style?: object | string | null;
  created_at?: string;
  updated_at?: string;
}

// Define NodeData for creating new nodes
export interface NodeData {
  canvas_id: string;
  node_type: string;
  content?: string | null;
  position: Position;
  dimensions: Dimensions;
  file_path?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  style?: object | null;
}
