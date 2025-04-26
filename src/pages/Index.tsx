import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Clipboard, ClipboardCheck, Info, Copy, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const Index = () => {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
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

  const generateRandomCode = () => {
    // Generate a random code using lowercase letters and numbers
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const length = 6;
    
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    setCode(result);
  };

  const copyToClipboard = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      
      toast({
        title: "Code copied!",
        description: "Canvas code copied to clipboard",
      });
      
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="flex flex-col items-center gap-3">
            <img 
              src="./images/slate_Logo.png" 
              alt="Slate Logo" 
              className="h-16 object-contain" 
            />
            <h1 className="text-4xl font-bold tracking-tight">Slate</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Collaborate on an infinite canvas space
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Join or Create Canvas</CardTitle>
            <CardDescription>
              Enter an existing code to join or create a new canvas
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter canvas code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        onClick={copyToClipboard}
                        disabled={!code}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy code</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={generateRandomCode}
                  className="flex-1"
                >
                  <Clipboard className="mr-2 h-4 w-4" />
                  Generate Random Code
                </Button>
                <Button type="submit" className="flex-1">
                  Continue
                </Button>
              </div>
            </form>
          </CardContent>
          
          <CardFooter className="flex justify-center text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              <span>Share the same code with others to collaborate on the same canvas</span>
            </div>
          </CardFooter>
        </Card>
        
        <div className="bg-secondary/50 rounded-lg p-4 text-sm">
          <h3 className="font-medium mb-2">How it works</h3>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Enter any code to create or join a canvas</li>
            <li>Share the code with others to collaborate</li>
            <li>Upload images, add text notes, and arrange items on the canvas</li>
            <li>Changes are saved automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Index;
