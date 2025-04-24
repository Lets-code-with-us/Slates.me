
import { Node } from "@/types";
import { supabase } from "@/integrations/supabase/client";

interface FilePreviewProps {
  node: Node;
}

export const FilePreview = ({ node }: FilePreviewProps) => {
  if (!node.file_path) return null;

  const fileUrl = supabase.storage.from('slate_files').getPublicUrl(node.file_path).data.publicUrl;

  switch (node.node_type) {
    case 'image':
      return (
        <img
          src={fileUrl}
          alt={node.file_name || 'Image'}
          className="w-full h-full object-contain rounded-lg"
        />
      );
    case 'video':
      return (
        <video
          src={fileUrl}
          controls
          className="w-full h-full object-contain rounded-lg"
        />
      );
    case 'pdf':
      return (
        <iframe
          src={fileUrl}
          className="w-full h-full rounded-lg"
          title={node.file_name || 'PDF Document'}
        />
      );
    default:
      return null;
  }
};
