import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, Shield, Zap } from 'lucide-react';

const Index = () => {
  const { user, profile, loading } = useAuth();

  // Redirect authenticated users
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    if (profile?.status === 'active') {
      return <Navigate to="/app" replace />;
    } else {
      return <Navigate to="/auth" replace />;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <MessageSquare className="h-20 w-20 mx-auto mb-8 text-primary" />
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Komunitas Tertutup
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join our exclusive private community chat platform. Connect with like-minded members 
            in a secure, closed environment.
          </p>
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <Button size="lg" asChild>
              <a href="/auth">Get Started</a>
            </Button>
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Private & Secure</h3>
            <p className="text-muted-foreground">
              Admin-approved members only. Your conversations stay within the community.
            </p>
          </div>
          <div className="text-center p-6">
            <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Real-time Chat</h3>
            <p className="text-muted-foreground">
              Instant messaging with file sharing, typing indicators, and presence status.
            </p>
          </div>
          <div className="text-center p-6">
            <Zap className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">File Sharing</h3>
            <p className="text-muted-foreground">
              Share documents, PDFs, and spreadsheets securely with your community.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
