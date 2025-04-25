
import { Move, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface NodeHeaderProps {
  nodeId: string;
  filePath?: string;
  fileName?: string;
  nodeType: string;
  onDragStart: (e: React.MouseEvent) => void;
  onDragMove: (e: React.MouseEvent) => void;
  onDragEnd: () => void;
}

export const NodeHeader = ({ 
  nodeId, 
  filePath, 
  fileName, 
  nodeType,
  onDragStart,
  onDragMove,
  onDragEnd
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

  return (
    <div 
      className="absolute top-0 left-0 right-0 h-8 bg-gray-100 border-b border-gray-200 flex items-center px-2 cursor-grab"
      onMouseDown={onDragStart}
      onMouseMove={onDragMove}
      onMouseUp={onDragEnd}
      onMouseLeave={onDragEnd}
    >
      <Move className="h-4 w-4 text-gray-500 mr-2" />
      <div className="text-xs text-gray-500 truncate flex-1">
        {fileName || nodeType}
      </div>
      <button
        onClick={handleDelete}
        className="p-1 rounded-full hover:bg-red-100 transition-colors"
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </button>
    </div>
  );
};
