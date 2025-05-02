
import { InfiniteCanvas as Canvas } from "@/components/Canvas/InfiniteCanvas";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";

const InfiniteCanvas = () => {
  const { code } = useParams();

  useEffect(() => {
    // Prevent zooming on mobile browsers
    const metaViewport = document.querySelector('meta[name=viewport]');
    const originalContent = metaViewport?.getAttribute('content');
    
    metaViewport?.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    
    // Show toast with instructions on first load
    toast({
      title: "Canvas Text Editor",
      description: "Click anywhere on the canvas to add text or double-click existing text to edit.",
      duration: 5000,
    });
    
    return () => {
      if (originalContent) {
        metaViewport?.setAttribute('content', originalContent);
      }
    };
  }, []);

  if (!code) {
    return <div className="p-8 text-center">No canvas code provided</div>;
  }

  return <Canvas />;
};

export default InfiniteCanvas;
