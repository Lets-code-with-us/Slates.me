
import { Download, MapPin, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface NodeHeaderProps {
  nodeId: string;
  filePath?: string;
  fileName?: string;
  nodeType: string;
  onResizeStart: (e: React.MouseEvent) => void;
  onResizeMove: (e: React.MouseEvent) => void;
  onResizeEnd: () => void;
  position: { x: number; y: number };
}

export const NodeHeader = ({ 
  nodeId, 
  filePath, 
  fileName, 
  nodeType,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
  position,
}: NodeHeaderProps) => {
  const handleDelete = async () => {
    try {
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('slate_files')
          .remove([filePath]);

        if (storageError) throw storageError;
      }

      const { error: dbError } = await supabase
        .from('nodes')
        .delete()
        .eq('id', nodeId);

      if (dbError) throw dbError;

      toast({
        title: "Node deleted",
        description: "Successfully removed the node from canvas"
      });
    } catch (error) {
      console.error('Error deleting node:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete the node",
        variant: "destructive"
      });
    }
  };

  const handleDownload = async () => {
    if (!filePath) return;
    
    try {
      const { data: { publicUrl } } = supabase.storage
        .from('slate_files')
        .getPublicUrl(filePath);

      const link = document.createElement('a');
      link.href = publicUrl;
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download started",
        description: `Downloading ${fileName || 'file'}`
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Failed to download the file",
        variant: "destructive"
      });
    }
  };

  return (
    <div 
      className="absolute top-0 left-0 right-0 h-8 bg-gray-100 border-b border-gray-200 flex items-center px-2 cursor-move"
      onMouseDown={onResizeStart}
      onMouseMove={onResizeMove}
      onMouseUp={onResizeEnd}
      onMouseLeave={onResizeEnd}
    >
      <MapPin className="h-4 w-4 text-gray-500 mr-2" />
      <div className="text-xs text-gray-500 truncate flex-1">
        {fileName || nodeType}
      </div>
      {filePath && (
        <button
          onClick={handleDownload}
          className="p-1 rounded-full hover:bg-gray-200 transition-colors mr-1"
        >
          <Download className="h-4 w-4 text-gray-500" />
        </button>
      )}
      <button
        onClick={handleDelete}
        className="p-1 rounded-full hover:bg-gray-200 transition-colors"
      >
        <Trash2 className="h-4 w-4 text-gray-500" />
      </button>
    </div>
  );
};
