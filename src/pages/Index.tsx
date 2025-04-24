
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
    navigate(`/c/${code}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md w-full">
        <h1 className="text-4xl font-bold tracking-tight">Slate</h1>
        <p className="text-lg text-muted-foreground">
          Enter a code to create or join an infinite canvas
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="Enter canvas code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="text-center"
          />
          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Index;
