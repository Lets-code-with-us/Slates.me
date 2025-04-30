import { ArrowLeft, Plus, File, FileText, Moon, Sun, ZoomIn, ZoomOut, Upload, ChevronsUp, Home, Loader2, Trash2, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { NodeData, Node } from "@/types";
import { findAvailablePosition } from "@/lib/node-placement";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StackIcon } from "@/components/ui/stack-icon";
import { cn } from "@/lib/utils";

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
  const [isClearing, setIsClearing] = useState(false);

  const onDrop = async (acceptedFiles: File[]) => {
    if (isUploading || !canvasId) return;
    setIsUploading(true);
    try {
      for (const file of acceptedFiles) {
        try {
          const timestamp = new Date().getTime();
          const uniqueFileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const filePath = `${code}/${uniqueFileName}`;
          const MAX_SIZE = 10 * 1024 * 1024;
          if (file.size > MAX_SIZE) {
            continue;
          }
          const { error: uploadError } = await supabase.storage
            .from('slate_files')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });
          if (uploadError) {
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
            dimensions,
            keep_minimap_hidden: true // Add this flag to prevent minimap from showing
          };
          onAddNode(node);
        } catch {}
      }
    } catch {}
    finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true
  });

  const handleCreateTextNode = () => {
    if (!canvasId) {
      return;
    }
    
    // Calculate optimal dimensions based on viewport size
    const dimensions = {
      width: Math.min(400, (viewportBounds?.width || 800) * 0.4),
      height: Math.min(300, (viewportBounds?.height || 600) * 0.3)
    };

    // Find a position that's visible in the current viewport
    const position = findAvailablePosition(nodes, dimensions, viewportBounds || null);
    
    const node: NodeData = {
      canvas_id: canvasId,
      node_type: 'text',
      content: '',
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

  const handleClearCanvas = async () => {
    if (!canvasId || isClearing) return;
    
    try {
      setIsClearing(true);
      
      // Delete all files from storage first
      const filesToDelete = nodes
        .filter(node => node.file_path)
        .map(node => node.file_path as string);
        
      if (filesToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('slate_files')
          .remove(filesToDelete);
          
        if (storageError) throw storageError;
      }
      
      // Delete all nodes from the database
      const { error: dbError } = await supabase
        .from('nodes')
        .delete()
        .eq('canvas_id', canvasId);
        
      if (dbError) throw dbError;
      
    } catch (error) {
      // Use standardized error handler
      import('@/lib/error-handler').then(({ handleError }) => {
        handleError(error, {
          title: "Clear Canvas Failed",
          message: "Unable to clear the canvas"
        });
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <>
      <div className={cn(
        "fixed z-50 flex items-center gap-2 bg-background/40 backdrop-blur-sm p-2 rounded-lg border shadow-sm",
        "sm:flex-col sm:top-4 sm:left-4",
        "flex-row bottom-4 left-1/2 -translate-x-1/2 sm:translate-x-0"
      )}>
        <TooltipProvider delayDuration={300}>
          <div className="flex sm:justify-center mb-1">
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
        
          <div className="hidden sm:block h-px w-full bg-border my-1" />
          
          <div className="flex sm:flex-col gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleCreateTextNode}>
                  <StickyNote className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div className="space-y-1">
                  <p>Create note</p>
                  <p className="text-xs text-muted-foreground">Add a new text note to your canvas</p>
                </div>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleUploadClick}>
                  <Upload className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div className="space-y-1">
                  <p>Upload files</p>
                  <p className="text-xs text-muted-foreground">Files will be automatically deleted after 7 days</p>
                </div>
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
          
          <div className="hidden sm:block h-px w-full bg-border my-1" />
          
          <div className="flex sm:flex-col gap-2">
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
            
            <div className="text-center py-1 text-xs font-medium bg-background/80 backdrop-blur-sm rounded-md text-muted-foreground px-2">
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
          
          <div className="hidden sm:block h-px w-full bg-border my-1" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleClearCanvas}
                disabled={isClearing || nodes.length === 0}
                className={cn(
                  "hover:bg-destructive/90 hover:text-destructive-foreground",
                  isClearing && "opacity-50 cursor-not-allowed"
                )}
              >
                {isClearing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Clear canvas</p>
            </TooltipContent>
          </Tooltip>
          
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

      {isUploading && (
        <div className="fixed top-4 right-16 sm:right-20 z-50 flex items-center gap-2 bg-background/40 backdrop-blur-sm px-3 py-1.5 rounded-lg border shadow-sm">
          <Loader2 className="animate-spin h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Uploading...</span>
        </div>
      )}
    </>
  );
};
