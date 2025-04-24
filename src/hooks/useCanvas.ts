
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
      const { data: canvas } = await supabase
        .from("canvases")
        .select("*")
        .eq("code", code)
        .single();

      if (!canvas) {
        const { data: newCanvas } = await supabase
          .from("canvases")
          .insert([{ code }])
          .select()
          .single();
        return newCanvas;
      }

      return canvas;
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

  const viewConfig = canvas?.view_config as ViewConfig;

  return {
    canvas,
    nodes,
    viewConfig,
    updateViewConfig,
  };
};
