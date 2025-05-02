
import React from 'react';
import { TextEditor } from './TextEditor';
import { Node } from '@/types';

interface TextEditorOverlayProps {
  isEditing: boolean;
  editingNode: Node | null;
  editorPosition: { x: number; y: number };
  editorDimensions: { width: number; height: number };
  scale: number;
  position: { x: number; y: number };
  canvasId: string;
  onSubmit: (content: string) => void;
  onCancel: () => void;
}

export const TextEditorOverlay: React.FC<TextEditorOverlayProps> = ({
  isEditing,
  editingNode,
  editorPosition,
  editorDimensions,
  scale,
  position,
  canvasId,
  onSubmit,
  onCancel
}) => {
  if (!isEditing) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      <div 
        className="relative w-full h-full" 
        style={{ 
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, 
          transformOrigin: "0 0" 
        }}
      >
        <div className="pointer-events-auto">
          <TextEditor
            node={editingNode || {
              id: 'new',
              canvas_id: canvasId,
              node_type: 'text',
              position: editorPosition,
              dimensions: editorDimensions,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }}
            scale={scale}
            position={editorPosition}
            dimensions={editorDimensions}
            initialContent={editingNode?.content || ''}
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
        </div>
      </div>
    </div>
  );
};
