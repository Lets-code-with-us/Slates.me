import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

const Index = () => {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast({
        title: "Error",
        description: "Please enter a code to continue",
        variant: "destructive",
      });
      return;
    }
    
    // Clean up code by removing spaces and special characters
    const cleanCode = code.trim().replace(/[^a-zA-Z0-9-_]/g, '');
    navigate(`/${cleanCode}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-12">
          <img 
            src="./images/slate_Logo.png" 
            alt="Slate Logo" 
            className="h-16 mx-auto mb-4" 
          />
          <h1 className="text-5xl font-bold tracking-tighter mb-3">Slate</h1>
          <p className="text-lg text-muted-foreground">
            The simplest way to collaborate on an infinite canvas
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center">
            <div className="flex border border-r-0 border-input bg-muted h-14 px-3 rounded-l-xl items-center text-muted-foreground">
              slates.me/
            </div>
            <Input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="your-canvas-name"
              className="h-14 text-lg rounded-none rounded-r-xl border-l-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
          </div>
          
          <Button type="submit" className="w-full h-14 text-lg rounded-xl">
            Go!
          </Button>
        </form>
        
        <p className="text-center text-sm text-muted-foreground mt-8">
          No login required
        </p>
        
        <div className="mt-16 text-center text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} Slate
          </p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <span>|</span>
            <a href="#" className="hover:underline">Terms of Use</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
