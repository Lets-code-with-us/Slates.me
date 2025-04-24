
import { InfiniteCanvas as Canvas } from "@/components/Canvas/InfiniteCanvas";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const InfiniteCanvas = () => {
  const { code } = useParams();

  // Ensure storage bucket exists
  useEffect(() => {
    const ensureStorageBucket = async () => {
      try {
        // Check if the bucket already exists
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        
        if (listError) throw listError;
        
        const bucketExists = buckets?.some(bucket => bucket.name === 'slate_files');
        
        if (!bucketExists) {
          // Create the bucket if it doesn't exist
          const { error: createError } = await supabase.storage.createBucket('slate_files', {
            public: true,
            fileSizeLimit: 10485760 // 10MB
          });
          
          if (createError) throw createError;
          
          console.log('Created slate_files storage bucket');
        }
      } catch (error) {
        console.error('Error ensuring storage bucket exists:', error);
        toast({
          title: "Storage Setup Error",
          description: "Could not configure file storage. Files may not upload correctly.",
          variant: "destructive"
        });
      }
    };
    
    ensureStorageBucket();
  }, []);

  if (!code) {
    return <div className="p-8 text-center">No canvas code provided</div>;
  }

  return <Canvas />;
};

export default InfiniteCanvas;
