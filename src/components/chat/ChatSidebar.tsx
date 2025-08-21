import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  LogOut, 
  Search, 
  Hash, 
  Plus,
  Shield
} from 'lucide-react';
import { Room } from './ChatLayout';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  rooms: Room[];
  activeRoomId: string | null;
  onRoomSelect: (roomId: string) => void;
}

export function ChatSidebar({ rooms, activeRoomId, onRoomSelect }: ChatSidebarProps) {
  const { profile, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.display_name}
              </p>
              <div className="flex items-center space-x-2">
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  @{profile?.username}
                </p>
                {profile?.role === 'admin' && (
                  <Badge variant="secondary" className="h-4 px-1 text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sidebar-foreground/40 h-4 w-4" />
          <Input
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-sidebar-accent border-sidebar-border"
          />
        </div>
      </div>

      {/* Rooms list */}
      <div className="flex-1 overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-sidebar-foreground/80">Rooms</h3>
            {profile?.role === 'admin' && (
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-1">
              {filteredRooms.map((room) => (
                <Button
                  key={room.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-left h-auto p-3",
                    activeRoomId === room.id && "bg-sidebar-accent"
                  )}
                  onClick={() => onRoomSelect(room.id)}
                >
                  <Hash className="h-4 w-4 mr-2 flex-shrink-0 text-sidebar-foreground/60" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {room.name}
                    </p>
                    {room.description && (
                      <p className="text-xs text-sidebar-foreground/60 truncate">
                        {room.description}
                      </p>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}