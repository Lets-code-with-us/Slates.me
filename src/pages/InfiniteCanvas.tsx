
import { InfiniteCanvas as Canvas } from "@/components/Canvas/InfiniteCanvas";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "react-router-dom";

const InfiniteCanvas = () => {
  const { code } = useParams();

  if (!code) {
    return <div className="p-8 text-center">No canvas code provided</div>;
  }

  return <Canvas />;
};

export default InfiniteCanvas;
