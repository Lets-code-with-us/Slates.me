
import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Node, ViewConfig } from "@/types";

export const useCanvas = (code?: string) => {
  const queryClient = useQueryClient();

  const { data: canvas } = useQuery({
    queryKey: ["canvas", code],
    queryFn: async () => {
      if (!code) return null;
      
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
      
      return newCanvas;
    },
    enabled: !!code,
  });

  const { data: nodes = [] } = useQuery({
    queryKey: ["nodes", canvas?.id],
    queryFn: async () => {
      if (!canvas?.id) return [];
      const { data: nodes } = await supabase
        .from("nodes")
        .select("*")
        .eq("canvas_id", canvas.id);
      return (nodes || []) as Node[];
    },
    enabled: !!canvas?.id,
  });

  const updateViewConfig = useCallback(
    async (viewConfig: ViewConfig) => {
      if (!canvas?.id) return;
      await supabase
        .from("canvases")
        .update({ view_config: viewConfig as any })
        .eq("id", canvas.id);
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
  }

  return {
    canvas,
    nodes,
    viewConfig,
    updateViewConfig,
  };
};
