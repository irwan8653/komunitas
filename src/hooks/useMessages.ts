import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Message } from '@/components/chat/ChatLayout';
import { useToast } from '@/hooks/use-toast';

export function useMessages(roomId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!roomId || !user) {
      setMessages([]);
      return;
    }

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages(prev => prev.map(msg => 
            msg.id === updatedMessage.id ? updatedMessage : msg
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, user]);

  const fetchMessages = async () => {
    if (!roomId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          files (
            id,
            filename,
            mime_type,
            size_bytes,
            storage_path
          )
        `)
        .eq('room_id', roomId)
        .is('deleted_at', null)
        .order('created_at');

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = useCallback(async (content: string, fileId?: string) => {
    if (!roomId || !user || !profile) return;
    if (!content.trim() && !fileId) return;

    try {
      const messageData = {
        room_id: roomId,
        sender_id: user.id,
        sender_username: profile.username,
        content: content || null,
        file_id: fileId || null,
      };

      const { error } = await supabase
        .from('messages')
        .insert([messageData]);

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      throw error;
    }
  }, [roomId, user, profile, toast]);

  const uploadFile = useCallback(async (file: File): Promise<{ fileId?: string; error?: any }> => {
    if (!roomId || !user) {
      return { error: 'Not authenticated' };
    }

    try {
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${roomId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('room-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create file record
      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .insert([{
          room_id: roomId,
          uploader_id: user.id,
          storage_path: filePath,
          filename: file.name,
          mime_type: file.type,
          size_bytes: file.size,
        }])
        .select()
        .single();

      if (fileError) throw fileError;

      return { fileId: fileData.id };
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload Failed",
        description: "Could not upload the file. Please try again.",
        variant: "destructive",
      });
      return { error };
    }
  }, [roomId, user, toast]);

  return { 
    messages, 
    loading, 
    sendMessage, 
    uploadFile,
    refetch: fetchMessages 
  };
}