import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Page Not Found - Slate</title>
        <meta name="description" content="The page you're looking for doesn't exist. Return to Slate's infinite canvas collaboration tool." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <main className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <img 
            src="/images/slate_Logo.png" 
            alt="Slate Logo" 
            className="h-16 mx-auto mb-8"
            width="64"
            height="64"
          />
          
          <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
          
          <p className="text-lg text-muted-foreground mb-8">
            The canvas you're looking for might have been moved or deleted. 
            Would you like to create a new one?
          </p>

          <div className="space-y-4">
            <Button 
              onClick={() => navigate("/")} 
              size="lg" 
              className="w-full"
            >
              Create New Canvas
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.history.back()} 
              size="lg" 
              className="w-full"
            >
              Go Back
            </Button>
          </div>
        </div>
      </main>
    </>
  );
};

export default NotFound;
