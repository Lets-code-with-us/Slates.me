import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Helmet } from "react-helmet-async";

const Index = () => {
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      return;
    }
    
    const cleanCode = code.trim().replace(/[^a-zA-Z0-9-_]/g, '');
    navigate(`/${cleanCode}`);
  };

  return (
    <>
      <Helmet>
        <title>Slate - Infinite canvas</title>
        <meta name="description" content="Create and share infinite canvases with your team. No login required. Collaborate in real-time with text, images, and files." />
      </Helmet>
      
      <main className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="w-full max-w-md px-4">
          <header className="text-center mb-12">
            <img 
              src="./images/slate_Logo.png" 
              alt="Slate - Infinite Canvas Tool" 
              className="h-16 mx-auto mb-4" 
              width="64"
              height="64"
            />
            <h1 className="text-5xl font-bold tracking-tighter mb-3">Slate</h1>
            <p className="text-lg text-muted-foreground">
              The simplest way to collaborate on an infinite canvas
            </p>
          </header>
          
          <form onSubmit={handleSubmit} className="space-y-6" role="form" aria-label="Create new canvas">
            <div className="flex items-center">
              <div className="flex border border-r-0 border-input bg-muted h-14 px-3 rounded-l-xl items-center text-muted-foreground" aria-hidden="true">
                slates.me/
              </div>
              <Input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="your-canvas-name"
                className="h-14 text-lg rounded-none rounded-r-xl border-l-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                aria-label="Canvas name"
                autoFocus
              />
            </div>
            
            <Button type="submit" className="w-full h-14 text-lg rounded-xl">
              Go!
            </Button>
          </form>
          
          <p className="text-center text-sm text-muted-foreground mt-8">
            No login required - Start collaborating instantly
          </p>
          
          <footer className="mt-16 text-center text-xs text-muted-foreground">
            <p>
              © {new Date().getFullYear()} Slate. All rights reserved.
            </p>
            <nav className="flex justify-center gap-4 mt-2" aria-label="Footer navigation">
              <a href="/privacy-policy" className="hover:underline">Privacy Policy</a>
              <span aria-hidden="true">|</span>
              <a href="/terms" className="hover:underline">Terms of Use</a>
            </nav>
          </footer>
        </div>
      </main>
    </>
  );
};

export default Index;
