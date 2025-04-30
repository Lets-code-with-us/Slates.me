import { useState, useEffect, useMemo } from 'react';
import { Node } from '@/types';
import { Search, X, FileText, Image, FileVideo, FileSpreadsheet, File, Filter, Clock, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { 
  CommandDialog, 
  CommandInput, 
  CommandList, 
  CommandEmpty, 
  CommandGroup, 
  CommandItem,
  CommandSeparator
} from '@/components/ui/command';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';

interface NodeFinderProps {
  nodes: Node[];
  onNavigateToNode: (nodeId: string) => void;
  className?: string;
}

export const NodeFinder = ({ nodes, onNavigateToNode, className }: NodeFinderProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<{
    text: boolean;
    image: boolean;
    video: boolean;
    pdf: boolean;
    sortByRecent: boolean;
  }>({
    text: false,
    image: false,
    video: false,
    pdf: false,
    sortByRecent: false
  });
  const [searchMode, setSearchMode] = useState<'content' | 'dateRange'>('content');
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({
    start: null,
    end: null
  });
  
  // Track keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+F / Cmd+F shortcut
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setOpen(true);
      }
      
      // Check for Escape key to close
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);
  
  // Enhanced filtering with date support
  const filteredNodes = useMemo(() => {
    // Start with all nodes
    let result = [...nodes];
    
    // Apply search filter
    if (search.trim()) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(node => {
        // For text nodes, do a more thorough content search
        if (node.node_type === 'text' && node.content) {
          // Split search terms and check if all are present
          const terms = lowerSearch.split(' ').filter(t => t.length > 0);
          const content = node.content.toLowerCase();
          return terms.every(term => content.includes(term));
        }
        
        // Check file name
        if (node.file_name && node.file_name.toLowerCase().includes(lowerSearch)) {
          return true;
        }
        
        // Check node type
        if (node.node_type.toLowerCase().includes(lowerSearch)) {
          return true;
        }
        
        return false;
      });
    }
    
    // Apply type filters
    const hasActiveFilters = filters.text || filters.image || filters.video || filters.pdf;
    if (hasActiveFilters) {
      result = result.filter(node => {
        if (filters.text && node.node_type === 'text') return true;
        if (filters.image && node.node_type === 'image') return true;
        if (filters.video && node.node_type === 'video') return true;
        if (filters.pdf && node.node_type === 'pdf') return true;
        return false;
      });
    }
    
    // Apply date range filter if active
    if (searchMode === 'dateRange' && (dateRange.start || dateRange.end)) {
      result = result.filter(node => {
        const nodeDate = new Date(node.updated_at || node.created_at);
        if (dateRange.start && nodeDate < dateRange.start) return false;
        if (dateRange.end && nodeDate > dateRange.end) return false;
        return true;
      });
    }

    // Apply sorting
    if (filters.sortByRecent) {
      result.sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at);
        const dateB = new Date(b.updated_at || b.created_at);
        return dateB.getTime() - dateA.getTime();
      });
    }
    
    return result;
  }, [nodes, search, filters, searchMode, dateRange]);

  // Check if any filters are active
  const hasActiveFilters = filters.text || filters.image || filters.video || filters.pdf || filters.sortByRecent;
  
  // Reset all filters
  const resetFilters = () => {
    setFilters({
      text: false,
      image: false,
      video: false,
      pdf: false,
      sortByRecent: false
    });
  };
  
  // Toggle a specific filter
  const toggleFilter = (filter: keyof typeof filters) => {
    setFilters(prev => ({
      ...prev,
      [filter]: !prev[filter]
    }));
  };
  
  // Get appropriate icon for node type
  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'text':
        return <StickyNote className="h-4 w-4 mr-2" />;
      case 'image':
        return <Image className="h-4 w-4 mr-2" />;
      case 'video':
        return <FileVideo className="h-4 w-4 mr-2" />;
      case 'pdf':
        return <FileSpreadsheet className="h-4 w-4 mr-2" />;
      default:
        return <File className="h-4 w-4 mr-2" />;
    }
  };
  
  // Get preview text for node
  const getNodePreview = (node: Node): string => {
    if (node.node_type === 'text' && node.content) {
      // For text nodes, show first line as title and preview of content
      const lines = node.content.split('\n');
      const title = lines[0].trim();
      const preview = lines.slice(1).join(' ').trim();
      
      if (preview) {
        return `${title}\n${preview.length > 100 ? preview.substring(0, 100) + '...' : preview}`;
      }
      return title.length > 150 ? title.substring(0, 150) + '...' : title;
    }
    
    return node.file_name || `${node.node_type} node`;
  };
  
  // Get formatted time for node
  const getNodeTime = (node: Node): string => {
    try {
      return format(new Date(node.updated_at), "MMM d, h:mm a");
    } catch(e) {
      return '';
    }
  };
  
  // Handle node selection
  const handleSelectNode = (nodeId: string) => {
    onNavigateToNode(nodeId);
    setOpen(false);
  };
  
  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        className={cn("fixed top-4 right-4 sm:right-6 z-50", className)}
        title="Find nodes (Ctrl+F)"
      >
        <Search className="h-4 w-4" />
        {hasActiveFilters && (
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
        )}
      </Button>
      
      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <CommandInput 
            placeholder="Search nodes..." 
            value={search}
            onValueChange={setSearch}
            className="flex-1"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearch('')}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="border-b px-3 py-2 flex items-center gap-2 flex-wrap">
          <span className="flex items-center text-sm">
            <Filter className="h-4 w-4 mr-1" />
            <span className="mr-2">Filters:</span>
          </span>
          
          <Toggle 
            size="sm" 
            variant={filters.text ? "default" : "outline"}
            pressed={filters.text}
            onClick={() => toggleFilter('text')}
            className="h-7"
          >
            <StickyNote className="h-3.5 w-3.5 mr-1" />
            Notes
          </Toggle>
          
          <Toggle 
            size="sm" 
            variant={filters.image ? "default" : "outline"}
            pressed={filters.image}
            onClick={() => toggleFilter('image')}
            className="h-7"
          >
            <Image className="h-3.5 w-3.5 mr-1" />
            Images
          </Toggle>
          
          <Toggle 
            size="sm" 
            variant={filters.video ? "default" : "outline"}
            pressed={filters.video}
            onClick={() => toggleFilter('video')}
            className="h-7"
          >
            <FileVideo className="h-3.5 w-3.5 mr-1" />
            Videos
          </Toggle>
          
          <Toggle 
            size="sm" 
            variant={filters.pdf ? "default" : "outline"}
            pressed={filters.pdf}
            onClick={() => toggleFilter('pdf')}
            className="h-7"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
            PDFs
          </Toggle>
          
          <Toggle
            size="sm"
            variant={filters.sortByRecent ? "default" : "outline"}
            pressed={filters.sortByRecent}
            onClick={() => toggleFilter('sortByRecent')}
            className="h-7"
          >
            <Clock className="h-3.5 w-3.5 mr-1" />
            Recent first
          </Toggle>
          
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetFilters}
              className="ml-auto h-7"
            >
              Reset
            </Button>
          )}
        </div>
        
        <CommandList>
          <CommandEmpty className="py-6 text-center text-sm">
            No matching nodes found. Try adjusting your search or filters.
          </CommandEmpty>
          
          <CommandGroup heading={`${filteredNodes.length} ${filteredNodes.length === 1 ? 'node' : 'nodes'} found`}>
            {filteredNodes.map(node => (
              <CommandItem
                key={node.id}
                onSelect={() => handleSelectNode(node.id)}
                className="flex items-center justify-between py-3 px-4"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {getNodeIcon(node.node_type)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{getNodePreview(node)}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] h-4">
                        {node.node_type}
                      </Badge>
                      <span>{getNodeTime(node)}</span>
                    </span>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
};