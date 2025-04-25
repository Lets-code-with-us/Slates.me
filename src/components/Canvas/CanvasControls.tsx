import { ArrowLeft, Plus, File, Text, Moon, Sun, ZoomIn, ZoomOut, Upload, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

interface CanvasControlsProps {
  code: string;
  canvasId: string;
  onAddNode: (node: any) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export const CanvasControls = ({ code, canvasId, onAddNode, onZoomIn, onZoomOut }: CanvasControlsProps) => {
  const { theme, setTheme } = useTheme();
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = async (acceptedFiles: File[]) => {
    if (isUploading || !canvasId) return;
    
    setIsUploading(true);
    try {
      for (const file of acceptedFiles) {
        const filePath = `${code}/${file.name}`;
        
        // Upload file to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('slate_files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Create node in database with the file reference
        const node = {
          canvas_id: canvasId,
          node_type: file.type.startsWith('image/') ? 'image' : 
                     file.type.startsWith('video/') ? 'video' : 
                     file.type === 'application/pdf' ? 'pdf' : 'file',
          file_path: filePath,
          file_name: file.name,
          file_type: file.type,
          position: { x: Math.random() * 300, y: Math.random() * 300 },
          dimensions: { width: 300, height: 200 }
        };

        onAddNode(node);
      }
      
      toast({
        title: "Files uploaded successfully",
        description: `Uploaded ${acceptedFiles.length} files`
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your files",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true
  });

  const handleCreateTextNode = () => {
    if (!canvasId) {
      toast({
        title: "Error",
        description: "Canvas not available",
        variant: "destructive"
      });
      return;
    }
    
    const node = {
      canvas_id: canvasId,
      node_type: 'text',
      content: 'Double click to edit',
      position: { x: Math.random() * 300, y: Math.random() * 300 },
      dimensions: { width: 200, height: 100 }
    };
    onAddNode(node);
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    open();
  };

  const handleFocusAllNodes = () => {
    const nodes = document.querySelectorAll('[data-node-id]');
    if (nodes.length === 0) return;

    // Calculate bounds of all nodes
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach((node) => {
      const rect = node.getBoundingClientRect();
      minX = Math.min(minX, rect.left);
      minY = Math.min(minY, rect.top);
      maxX = Math.max(maxX, rect.right);
      maxY = Math.max(maxY, rect.bottom);
    });

    // Center view on all nodes
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Dispatch a custom event to notify the canvas to update its position
    window.dispatchEvent(new CustomEvent('focusNodes', {
      detail: {
        x: containerWidth / 2 - centerX,
        y: containerHeight / 2 - centerY,
      }
    }));
  };

  return (
    <div className="fixed top-4 left-4 z-50 flex flex-col gap-2">
      <Button variant="outline" size="icon" asChild>
        <a href="/">
          <ArrowLeft className="h-4 w-4" />
        </a>
      </Button>
      
      <div className="h-px w-full bg-border" />
      
      <Button variant="outline" size="icon" onClick={handleCreateTextNode}>
        <Text className="h-4 w-4" />
      </Button>
      
      <Button variant="outline" size="icon" onClick={handleUploadClick}>
        <Upload className="h-4 w-4" />
      </Button>
      
      <div {...getRootProps()} className="contents">
        <input {...getInputProps()} />
        {isDragActive && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center border-2 border-dashed border-primary">
            <p className="text-lg font-medium">Drop files here</p>
          </div>
        )}
      </div>
      
      <div className="h-px w-full bg-border" />
      
      <Button variant="outline" size="icon" onClick={onZoomIn}>
        <ZoomIn className="h-4 w-4" />
      </Button>
      
      <Button variant="outline" size="icon" onClick={onZoomOut}>
        <ZoomOut className="h-4 w-4" />
      </Button>
      
      <div className="h-px w-full bg-border" />
      
      <Button
        variant="outline"
        size="icon"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      >
        {theme === "light" ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
      </Button>
      
      <Button variant="outline" size="icon" onClick={handleFocusAllNodes}>
        <MapPin className="h-4 w-4" />
      </Button>
    </div>
  );
};
