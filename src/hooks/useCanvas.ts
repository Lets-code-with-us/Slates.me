import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Node, ViewConfig } from "@/types";
import { toast } from "./use-toast";

export const useCanvas = (code?: string) => {
  const queryClient = useQueryClient();

  const { data: canvas } = useQuery({
    queryKey: ["canvas", code],
    queryFn: async () => {
      if (!code) return null;
      
      try {
        // Try to get the existing canvas
        const { data: canvas, error } = await supabase
          .from("canvases")
          .select("*")
          .eq("code", code)
          .single();

        // If canvas exists, return it
        if (canvas) {
          return canvas;
        }
        
        // If there was a validation error rather than "not found", throw it
        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching canvas:", error);
          throw error;
        }

        // Create a new canvas since it doesn't exist
        const { data: newCanvas, error: createError } = await supabase
          .from("canvases")
          .insert([{ code }])
          .select()
          .single();
          
        if (createError) {
          console.error("Error creating canvas:", createError);
          throw createError;
        }
        
        // Notify user of new canvas creation
        toast({
          title: "New Canvas Created",
          description: "Started a new canvas with this code"
        });
        
        return newCanvas;
      } catch (error) {
        // Import and use error handler
        const { handleError } = await import('@/lib/error-handler');
        handleError(error, {
          title: "Canvas Error",
          message: "Failed to load or create canvas"
        });
        
        // Return null to prevent further errors
        return null;
      }
    },
    enabled: !!code,
    retry: 1, // Only retry once to avoid excessive retries on real errors
  });

  const { data: nodes = [] } = useQuery({
    queryKey: ["nodes", canvas?.id],
    queryFn: async () => {
      if (!canvas?.id) return [];
      
      try {
        const { data: nodes, error } = await supabase
          .from("nodes")
          .select("*")
          .eq("canvas_id", canvas.id);
          
        if (error) throw error;
        
        return (nodes || []) as Node[];
      } catch (error) {
        // Import and use error handler
        const { handleError } = await import('@/lib/error-handler');
        handleError(error, {
          title: "Data Load Error",
          message: "Failed to load canvas elements"
        });
        
        // Return empty array to prevent UI from breaking
        return [];
      }
    },
    enabled: !!canvas?.id,
  });

  const updateViewConfig = useCallback(
    async (viewConfig: ViewConfig) => {
      if (!canvas?.id) return;
      
      try {
        const { error } = await supabase
          .from("canvases")
          .update({ view_config: viewConfig as any })
          .eq("id", canvas.id);
          
        if (error) throw error;
      } catch (error) {
        // We'll use dynamic import to avoid circular dependencies
        import('@/lib/error-handler').then(({ handleError }) => {
          handleError(error, {
            title: "View Update Failed",
            message: "Could not save canvas view state"
          });
        });
      }
    },
    [canvas?.id]
  );

  useEffect(() => {
    if (!canvas?.id) return;

    const channel = supabase
      .channel("canvas-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "nodes",
          filter: `canvas_id=eq.${canvas.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["nodes", canvas.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canvas?.id, queryClient]);

  // Properly type cast the view_config from JSON to our ViewConfig type
  let viewConfig: ViewConfig | undefined;
  if (canvas?.view_config) {
    try {
      const config = canvas.view_config as any;
      // Ensure the object has the expected shape before using it
      if (typeof config === 'object' && 
          'zoom' in config && 
          'position' in config && 
          typeof config.position === 'object' &&
          'x' in config.position && 
          'y' in config.position) {
        viewConfig = {
          zoom: Number(config.zoom),
          position: {
            x: Number(config.position.x),
            y: Number(config.position.y)
          }
        };
      } else {
        // Fallback to default values if structure is unexpected
        viewConfig = { zoom: 1, position: { x: 0, y: 0 } };
      }
    } catch (error) {
      // Handle parsing errors
      console.error("Error parsing view config:", error);
      viewConfig = { zoom: 1, position: { x: 0, y: 0 } };
    }
  }

  return {
    canvas,
    nodes,
    viewConfig,
    updateViewConfig,
  };
};
