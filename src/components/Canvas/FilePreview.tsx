
import { Node } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { FileText } from "lucide-react";

interface FilePreviewProps {
  node: Node;
}

export const FilePreview = ({ node }: FilePreviewProps) => {
  if (!node.file_path) return null;

  const fileUrl = supabase.storage.from('slate_files').getPublicUrl(node.file_path).data.publicUrl;

  const getFileExtension = (filename?: string) => {
    return filename?.split('.').pop()?.toLowerCase() || '';
  };

  switch (node.node_type) {
    case 'image':
      return (
        <div className="w-full h-full flex items-center justify-center overflow-hidden">
          <img
            src={fileUrl}
            alt={node.file_name || 'Image'}
            className="max-w-full max-h-full object-contain"
            loading="lazy"
            style={{ 
              imageRendering: 'high-quality',
              WebkitImageSmoothing: 'high',
            }}
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
          playsInline
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
    default: {
      const ext = getFileExtension(node.file_name);
      const isOffice = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);
      if (isOffice) {
        return (
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
            className="w-full h-full"
            title={node.file_name || 'Office Document'}
          />
        );
      }
      return (
        <div className="w-full h-full flex flex-col items-center justify-center">
          <FileText className="w-16 h-16 text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">{node.file_name}</p>
        </div>
      );
    }
  }
};
