import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageList } from './MessageList';
import { FileUpload } from './FileUpload';
import { Room, Message } from './ChatLayout';
import { Hash, Send, Paperclip } from 'lucide-react';

interface ChatMainProps {
  room?: Room;
  messages: Message[];
  loading: boolean;
  onSendMessage: (content: string, fileId?: string) => Promise<void>;
  onUploadFile: (file: File) => Promise<{ fileId?: string; error?: any }>;
}

export function ChatMain({ 
  room, 
  messages, 
  loading, 
  onSendMessage, 
  onUploadFile 
}: ChatMainProps) {
  const [messageContent, setMessageContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <Hash className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Select a room to start chatting</p>
        </div>
      </div>
    );
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(messageContent.trim());
      setMessageContent('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    setIsSending(true);
    setShowFileUpload(false);
    
    try {
      const result = await onUploadFile(file);
      if (result.fileId) {
        await onSendMessage('', result.fileId);
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Chat header */}
      <div className="h-16 border-b border-border px-6 flex items-center">
        <Hash className="h-5 w-5 mr-2 text-muted-foreground" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{room.name}</h1>
          {room.description && (
            <p className="text-sm text-muted-foreground">{room.description}</p>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6">
            <MessageList messages={messages} loading={loading} />
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Message input */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder={`Message #${room.name}`}
              disabled={isSending}
              className="pr-12"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
              onClick={() => setShowFileUpload(true)}
              disabled={isSending}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>
          <Button type="submit" disabled={!messageContent.trim() || isSending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>

        <FileUpload
          open={showFileUpload}
          onOpenChange={setShowFileUpload}
          onFileSelect={handleFileSelect}
        />
      </div>
    </div>
  );
}