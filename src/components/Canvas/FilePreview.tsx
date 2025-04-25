import { Node } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { FileIcon, ImageIcon, VideoIcon, AlertCircle, FileText, Film, Music, Code, Archive, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FilePreviewProps {
  node: Node;
}

export const FilePreview = ({ node }: FilePreviewProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadStarted, setIsLoadStarted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const maxRetries = 3;
  
  // PDF specific states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.0);
  const pdfViewerRef = useRef<HTMLIFrameElement>(null);
  
  // File type detection
  const getFileType = () => {
    if (!node.file_type) return 'unknown';
    
    if (node.file_type.startsWith('image/')) return 'image';
    if (node.file_type.startsWith('video/')) return 'video';
    if (node.file_type.startsWith('audio/')) return 'audio';
    if (node.file_type === 'application/pdf') return 'pdf';
    
    // Document types
    if (node.file_type.includes('word') || 
        node.file_type.includes('document') ||
        node.file_name?.endsWith('.doc') ||
        node.file_name?.endsWith('.docx')) return 'document';
        
    if (node.file_type.includes('spreadsheet') || 
        node.file_name?.endsWith('.xls') ||
        node.file_name?.endsWith('.xlsx')) return 'spreadsheet';
        
    if (node.file_type.includes('presentation') || 
        node.file_name?.endsWith('.ppt') ||
        node.file_name?.endsWith('.pptx')) return 'presentation';
        
    // Code files
    if (node.file_name?.match(/\.(js|ts|jsx|tsx|py|java|c|cpp|cs|php|rb|go|rust|html|css|json|xml)$/)) 
      return 'code';
      
    // Archives
    if (node.file_name?.match(/\.(zip|rar|tar|gz|7z)$/)) 
      return 'archive';
      
    return 'file';
  };
  
  const fileType = getFileType();

  // Generate signed URL with proper cache control to avoid stale content
  const getFileUrl = () => {
    if (!node.file_path) return '';
    
    try {
      // For retry mechanism, add cache-breaking query parameter
      const cacheBuster = retryCount > 0 ? `?cache=${Date.now()}` : '';
      return supabase.storage.from('slate_files').getPublicUrl(node.file_path).data.publicUrl + cacheBuster;
    } catch (error) {
      console.error('Error generating URL:', error);
      return '';
    }
  };

  const fileUrl = getFileUrl();

  // Handle retry button click
  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setRetryCount(retryCount + 1);
      setIsLoading(true);
      setHasError(false);
      setProgress(0);
    }
  };

  // Use Intersection Observer to detect when the component enters viewport
  useEffect(() => {
    if (!node.file_path) return;
    
    // Create new intersection observer
    const observer = new IntersectionObserver(
      (entries) => {
        // If intersecting (visible in viewport), set isVisible true
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          // Once loaded, disconnect the observer
          observer.disconnect();
        }
      },
      { 
        rootMargin: '200px', // Start loading a bit before it comes into view
        threshold: 0.01 
      }
    );

    // Get parent element (the node container)
    const parentElement = document.getElementById(`node-${node.id}`);
    if (parentElement) {
      observer.observe(parentElement);
    }

    return () => {
      observer.disconnect();
    };
  }, [node.id, node.file_path]);

  // For PDF navigation
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      sendPdfMessage('nextPage');
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      sendPdfMessage('prevPage');
    }
  };

  const zoomIn = () => {
    setPdfScale(prev => Math.min(prev + 0.25, 3));
    sendPdfMessage('zoomIn');
  };

  const zoomOut = () => {
    setPdfScale(prev => Math.max(prev - 0.25, 0.5));
    sendPdfMessage('zoomOut');
  };

  const sendPdfMessage = (action: string) => {
    if (pdfViewerRef.current && pdfViewerRef.current.contentWindow) {
      pdfViewerRef.current.contentWindow.postMessage({
        action,
        source: 'slate-pdf-viewer'
      }, '*');
    }
  };

  // Listen for messages from PDF iframe
  useEffect(() => {
    const handlePdfMessage = (e: MessageEvent) => {
      if (e.data && e.data.source === 'pdf-viewer') {
        if (e.data.type === 'pagechange') {
          setCurrentPage(e.data.page);
        } else if (e.data.type === 'docloaded') {
          setTotalPages(e.data.totalPages);
          setIsLoading(false);
        }
      }
    };

    window.addEventListener('message', handlePdfMessage);
    return () => window.removeEventListener('message', handlePdfMessage);
  }, []);

  // Simulate loading progress for better UX
  useEffect(() => {
    if (isVisible && isLoading && !hasError && !isLoadStarted) {
      setIsLoadStarted(true);
      
      // For images and other media, implement progressive loading quality
      if (fileType === 'image') {
        // First load a small blurred preview, then the full image
        const smallPreview = new Image();
        smallPreview.onload = () => {
          // Show small preview first at 40% progress
          setProgress(40);
          
          // Then start loading full quality
          setTimeout(() => {
            // Continue progress simulation to 90%
            const interval = setInterval(() => {
              setProgress(prev => {
                const increment = prev < 70 ? 8 : 3;
                const newProgress = Math.min(prev + increment, 90);
                return newProgress;
              });
            }, 200);
            
            return () => clearInterval(interval);
          }, 200);
        };
        
        // Set src to load small preview
        if (node.file_path) {
          smallPreview.src = supabase.storage
            .from('slate_files')
            .getPublicUrl(node.file_path, {
              transform: {
                width: 200,
                height: 100,
                quality: 10,
                format: 'origin'
              }
            }).data.publicUrl;
        }
      } else {
        // For non-images, use normal progress simulation
        const interval = setInterval(() => {
          setProgress(prev => {
            const increment = prev < 30 ? 15 : prev < 70 ? 8 : 3;
            const newProgress = Math.min(prev + increment, 90);
            return newProgress;
          });
        }, 200);
        
        return () => clearInterval(interval);
      }
    }
  }, [isVisible, isLoading, hasError, isLoadStarted, fileType, node.file_path]);

  if (!node.file_path) return null;

  const handleLoad = () => {
    setProgress(100);
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    
    // Use our standardized error handler for logging, but with silent UI notification
    // (we already show visual error state in the component)
    import('@/lib/error-handler').then(({ handleError }) => {
      handleError(new Error(`Failed to load ${node.file_name || node.node_type}`), {
        title: "Media Load Failed",
        message: `Could not load ${node.file_name || node.node_type}`,
        // We'll handle the UI error display in the component, so no toast needed
      });
    });
  };

  // File type specific icons
  const getFileTypeIcon = () => {
    switch (fileType) {
      case 'image': return <ImageIcon size={32} />;
      case 'video': return <Film size={32} />;
      case 'audio': return <Music size={32} />;
      case 'pdf': return <FileText size={32} />;
      case 'document': return <FileText size={32} />;
      case 'spreadsheet': return <FileText size={32} />;
      case 'presentation': return <FileText size={32} />;
      case 'code': return <Code size={32} />;
      case 'archive': return <Archive size={32} />;
      default: return <FileIcon size={32} />;
    }
  };

  // Loading placeholder
  const LoadingPlaceholder = () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50 animate-pulse">
      <div className="text-gray-400 dark:text-gray-500 flex flex-col items-center">
        <div className="mb-3">
          {getFileTypeIcon()}
        </div>
        <div className="text-xs mb-4">Loading {node.file_name || fileType}...</div>
        <div className="w-48">
          <Progress value={progress} className="h-1" />
        </div>
      </div>
    </div>
  );

  // Error placeholder
  const ErrorPlaceholder = () => (
    <div className="w-full h-full flex items-center justify-center bg-red-50 dark:bg-red-900/20">
      <div className="text-red-500 dark:text-red-400 flex flex-col items-center p-4 text-center">
        <AlertCircle className="h-8 w-8 mb-2" />
        <div className="font-medium mb-1">Failed to load file</div>
        <div className="text-xs mb-3">{node.file_name || fileType}</div>
        {retryCount < maxRetries && (
          <button
            onClick={handleRetry}
            className="mt-2 px-4 py-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white text-xs rounded transition-colors"
          >
            Retry ({maxRetries - retryCount} attempts left)
          </button>
        )}
        {retryCount >= maxRetries && (
          <div className="text-xs mt-2">
            Max retries reached. The file might be missing or corrupted.
          </div>
        )}
      </div>
    </div>
  );

  // Generic file preview for non-media files
  const GenericFilePreview = () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-md">
      <div className="flex flex-col items-center max-w-[80%] text-center">
        <div className="mb-2 p-4 rounded-full bg-gray-100 dark:bg-gray-700">
          {getFileTypeIcon()}
        </div>
        <h3 className="text-sm font-medium mb-1">{node.file_name}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {fileType.charAt(0).toUpperCase() + fileType.slice(1)} file
        </p>
        <Button 
          size="sm" 
          variant="outline"
          className="text-xs"
          onClick={() => {
            // Create a download link
            const a = document.createElement('a');
            a.href = fileUrl;
            a.download = node.file_name || `file-${node.id}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }}
        >
          Download
        </Button>
      </div>
    </div>
  );

  // Return loading placeholder if not yet visible
  if (!isVisible) {
    return <LoadingPlaceholder />;
  }

  // Return error state if there's an error
  if (hasError) {
    return <ErrorPlaceholder />;
  }

  // Enhanced PDF viewer with controls
  if (fileType === 'pdf') {
    return (
      <div className="w-full h-full flex flex-col">
        {isLoading && <LoadingPlaceholder />}
        
        <div className={cn(
          "flex-1 relative", 
          isLoading ? "opacity-0" : "opacity-100 transition-opacity duration-300"
        )}>
          <iframe
            ref={pdfViewerRef}
            src={isVisible ? `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(fileUrl)}#pagemode=thumbs` : 'about:blank'}
            className="w-full h-full border-0"
            title={node.file_name || 'PDF Document'}
            onLoad={handleLoad}
            onError={handleError}
            allowFullScreen
          />
        </div>
        
        {!isLoading && (
          <div className="flex items-center justify-between p-1 bg-gray-100 dark:bg-gray-800 border-t dark:border-gray-700">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={prevPage} 
                disabled={currentPage <= 1}
                className="h-7 w-7"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <span className="text-xs mx-1">
                {currentPage} / {totalPages}
              </span>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={nextPage} 
                disabled={currentPage >= totalPages}
                className="h-7 w-7"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={zoomOut}
                className="h-7 w-7"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <span className="text-xs mx-1">
                {Math.round(pdfScale * 100)}%
              </span>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={zoomIn}
                className="h-7 w-7"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  setPdfScale(1.0);
                  sendPdfMessage('resetZoom');
                }}
                className="h-7 w-7 ml-1"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render appropriate preview based on file type
  switch (fileType) {
    case 'image':
      return (
        <>
          {isLoading && <LoadingPlaceholder />}
          <img
            src={isVisible ? fileUrl : ''}
            alt={node.file_name || 'Image'}
            className={cn(
              "w-full h-full object-contain transition-opacity duration-300", 
              isLoading ? "opacity-0" : "opacity-100"
            )}
            onLoad={handleLoad}
            onError={handleError}
          />
        </>
      );
      
    case 'video':
      return (
        <>
          {isLoading && <LoadingPlaceholder />}
          <video
            src={isVisible ? fileUrl : ''}
            className={cn(
              "w-full h-full transition-opacity duration-300", 
              isLoading ? "opacity-0" : "opacity-100"
            )}
            controls
            controlsList="nodownload"
            onLoadedData={handleLoad}
            onError={handleError}
          />
        </>
      );
      
    case 'audio':
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
          {isLoading ? (
            <LoadingPlaceholder />
          ) : (
            <>
              <div className="p-6 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                <Music className="h-12 w-12 text-gray-600 dark:text-gray-300" />
              </div>
              <p className="text-sm font-medium mb-4 text-center">{node.file_name}</p>
              <audio 
                src={fileUrl} 
                className="w-full" 
                controls 
                controlsList="nodownload"
                onLoadedData={handleLoad}
                onError={handleError}
              />
            </>
          )}
        </div>
      );
      
    case 'document':
    case 'spreadsheet':
    case 'presentation':
      // For document types, try to use Google Docs Viewer
      return (
        <>
          {isLoading && <LoadingPlaceholder />}
          <iframe
            src={isVisible ? `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true` : 'about:blank'}
            className={cn(
              "w-full h-full transition-opacity duration-300", 
              isLoading ? "opacity-0" : "opacity-100"
            )}
            title={node.file_name || fileType}
            onLoad={handleLoad}
            onError={handleError}
          />
        </>
      );
      
    // For other file types, show a generic preview
    default:
      return <GenericFilePreview />;
  }
};
