import { ArrowLeft, Plus, File, Text, Moon, Sun, ZoomIn, ZoomOut, Upload, ChevronsUp, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { NodeData, Node } from "@/types";
import { findAvailablePosition } from "@/lib/node-placement";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StackIcon } from "@/components/ui/stack-icon";

interface CanvasControlsProps {
  code: string;
  canvasId: string;
  nodes: Node[];
  onAddNode: (node: NodeData) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenterView?: () => void;
  viewportBounds?: { x: number; y: number; width: number; height: number };
  scale?: number;
}

export const CanvasControls = ({ 
  code, 
  canvasId, 
  nodes, 
  onAddNode, 
  onZoomIn, 
  onZoomOut,
  onCenterView,
  viewportBounds,
  scale = 1
}: CanvasControlsProps) => {
  const { theme, setTheme } = useTheme();
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = async (acceptedFiles: File[]) => {
    if (isUploading || !canvasId) return;
    
    setIsUploading(true);
    
    const successful: string[] = [];
    const failed: string[] = [];
    
    try {
      for (const file of acceptedFiles) {
        try {
          const timestamp = new Date().getTime();
          const uniqueFileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const filePath = `${code}/${uniqueFileName}`;
          
          const MAX_SIZE = 10 * 1024 * 1024;
          if (file.size > MAX_SIZE) {
            failed.push(`${file.name} (exceeds 10MB limit)`);
            continue;
          }
          
          // Only show a notification for the first file
          if (acceptedFiles.indexOf(file) === 0) {
            toast({
              title: `Uploading ${acceptedFiles.length > 1 ? acceptedFiles.length + ' files' : file.name}...`,
              duration: 2000,
            });
          }
          
          const { data, error: uploadError } = await supabase.storage
            .from('slate_files')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            if (uploadError.message?.includes('duplicate')) {
              failed.push(`${file.name} (already exists)`);
            } else if (uploadError.message?.includes('permission')) {
              failed.push(`${file.name} (permission denied)`);
            } else {
              failed.push(file.name);
              console.error('Upload error:', uploadError);
            }
            continue;
          }

          const dimensions = { width: 300, height: 200 };
          const position = findAvailablePosition(nodes, dimensions, viewportBounds || null);

          const node: NodeData = {
            canvas_id: canvasId,
            node_type: (file.type.startsWith('image/') ? 'image' : 
                      file.type.startsWith('video/') ? 'video' : 
                      file.type === 'application/pdf' ? 'pdf' : 'file') as 'image' | 'video' | 'pdf' | 'file',
            file_path: filePath,
            file_name: file.name,
            file_type: file.type,
            position,
            dimensions
          };

          onAddNode(node);
          successful.push(file.name);
        } catch (fileError) {
          failed.push(file.name);
          console.error('Individual file error:', fileError);
        }
      }
      
      if (successful.length > 0 && failed.length === 0) {
        toast({
          title: "Files uploaded successfully",
          description: `Uploaded ${successful.length} ${successful.length === 1 ? 'file' : 'files'}`,
          variant: "default"
        });
      } else if (successful.length > 0 && failed.length > 0) {
        toast({
          title: "Some uploads failed",
          description: `Uploaded ${successful.length}, failed ${failed.length}`,
          variant: "destructive"
        });
      } else if (successful.length === 0 && failed.length > 0) {
        toast({
          title: "Upload failed",
          description: `All ${failed.length} ${failed.length === 1 ? 'file' : 'files'} failed to upload`,
          variant: "destructive"
        });
      }
    } catch (error) {
      import('@/lib/error-handler').then(({ handleError }) => {
        handleError(error, {
          title: "Upload Process Failed",
          message: "There was a problem with the upload process. Please try again.",
          action: "Check your internet connection and file permissions."
        });
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
    
    const dimensions = { width: 200, height: 100 };
    const position = findAvailablePosition(nodes, dimensions, viewportBounds || null);
    
    const node: NodeData = {
      canvas_id: canvasId,
      node_type: 'text',
      content: 'Double click to edit',
      position,
      dimensions
    };
    onAddNode(node);
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    open();
  };

  return (
    <div className="fixed top-4 left-4 z-50 flex flex-col gap-2 bg-background/40 backdrop-blur-sm p-2 rounded-lg border shadow-sm">
      <TooltipProvider delayDuration={300}>
        <div className="flex justify-center mb-1">
          <img 
            src="/images/slate_Logo.png" 
            alt="Slate Logo" 
            className="h-6 w-auto object-contain" 
          />
        </div>
      
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" asChild>
              <a href="/">
                <ArrowLeft className="h-4 w-4" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Return home</p>
          </TooltipContent>
        </Tooltip>
      
        <div className="h-px w-full bg-border my-1" />
        
        <div className="flex flex-col gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleCreateTextNode}>
                <Text className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add text node</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleUploadClick}>
                <Upload className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Upload files</p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        <div {...getRootProps()} className="contents">
          <input {...getInputProps()} />
          {isDragActive && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center border-2 border-dashed border-primary">
              <p className="text-lg font-medium">Drop files here</p>
            </div>
          )}
        </div>
        
        <div className="h-px w-full bg-border my-1" />
        
        <div className="flex flex-col gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Zoom in</p>
            </TooltipContent>
          </Tooltip>
          
          {/* Zoom percentage indicator */}
          <div className="text-center py-1 text-xs font-medium bg-background/80 backdrop-blur-sm rounded-md text-muted-foreground">
            {Math.round(scale * 100)}%
          </div>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Zoom out</p>
            </TooltipContent>
          </Tooltip>
          
          {onCenterView && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={onCenterView}>
                  <Home className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Center view</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        <div className="h-px w-full bg-border my-1" />
        
        <Tooltip>
          <TooltipTrigger asChild>
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
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Toggle {theme === "light" ? "dark" : "light"} mode</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
