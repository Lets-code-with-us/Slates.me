
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
    
    // Show toast warning about the 3-day deletion policy
    toast({
      title: "Temporary Canvas",
      description: "This canvas and all its files will be automatically deleted after 3 days."
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
