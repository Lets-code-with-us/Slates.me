
import { Node } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { Move } from "lucide-react";

interface FilePreviewProps {
  node: Node;
}

export const FilePreview = ({ node }: FilePreviewProps) => {
  if (!node.file_path) return null;

  const fileUrl = supabase.storage.from('slate_files').getPublicUrl(node.file_path).data.publicUrl;

  switch (node.node_type) {
    case 'image':
      return (
        <div className="w-full h-full flex items-center justify-center overflow-hidden">
          <img
            src={fileUrl}
            alt={node.file_name || 'Image'}
            className="max-w-full max-h-full object-contain"
            loading="lazy"
            style={{ imageRendering: 'auto' }}
          />
        </div>
      );
    case 'video':
      return (
        <video
          src={fileUrl}
          controls
          className="w-full h-full object-contain"
          preload="metadata"
        />
      );
    case 'pdf':
      return (
        <iframe
          src={fileUrl}
          className="w-full h-full"
          title={node.file_name || 'PDF Document'}
        />
      );
    default:
      return null;
  }
};
