
import { FilePreview } from "./FilePreview";
import { Node } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface NodeContentProps {
  node: Node;
  isEditing: boolean;
  content: string;
  onContentChange: (content: string) => void;
  onBlur: () => void;
}

export const NodeContent = ({ 
  node, 
  isEditing, 
  content, 
  onContentChange, 
  onBlur 
}: NodeContentProps) => {
  if (node.node_type === 'text') {
    return (
      <div className="w-full h-full">
        {isEditing ? (
          <textarea
            className="w-full h-full p-2 bg-transparent resize-none focus:outline-none text-sm text-gray-700"
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            onBlur={onBlur}
            autoFocus
          />
        ) : (
          <div className="w-full h-full overflow-auto">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{content}</p>
          </div>
        )}
      </div>
    );
  }
  
  if (node.node_type === 'image' || node.node_type === 'video' || node.node_type === 'pdf') {
    return <FilePreview node={node} />;
  }

  return null;
};
