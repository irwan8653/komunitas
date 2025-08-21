import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { ChatLayout } from '@/components/chat/ChatLayout';

const ChatApp = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/auth" replace />;
  }

  if (profile.status !== 'active') {
    return <Navigate to="/auth" replace />;
  }

  return <ChatLayout />;
};

export default ChatApp;