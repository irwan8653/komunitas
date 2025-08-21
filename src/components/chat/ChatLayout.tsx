import { useState, useEffect } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { ChatMain } from './ChatMain';
import { useRooms } from '@/hooks/useRooms';
import { useMessages } from '@/hooks/useMessages';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

export interface Room {
  id: string;
  name: string;
  description?: string;
  is_private: boolean;
  created_by?: string;
  created_at: string;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  sender_username: string;
  content?: string;
  file_id?: string;
  created_at: string;
  edited_at?: string;
  deleted_at?: string;
  files?: {
    id: string;
    filename: string;
    mime_type: string;
    size_bytes: number;
    storage_path: string;
  };
}

export function ChatLayout() {
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const { rooms, loading: roomsLoading } = useRooms();
  const { messages, loading: messagesLoading, sendMessage, uploadFile } = useMessages(activeRoomId);

  useEffect(() => {
    if (rooms.length > 0 && !activeRoomId) {
      setActiveRoomId(rooms[0].id);
    }
  }, [rooms, activeRoomId]);

  const activeRoom = rooms.find(room => room.id === activeRoomId);

  return (
    <div className="h-screen flex bg-background">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-80 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:block
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <ChatSidebar
          rooms={rooms}
          activeRoomId={activeRoomId}
          onRoomSelect={(roomId) => {
            setActiveRoomId(roomId);
            setSidebarOpen(false);
          }}
        />
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <ChatMain
          room={activeRoom}
          messages={messages}
          loading={messagesLoading}
          onSendMessage={sendMessage}
          onUploadFile={uploadFile}
        />
      </div>
    </div>
  );
}