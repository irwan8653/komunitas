-- Create custom types
CREATE TYPE public.user_status AS ENUM ('pending', 'active', 'blocked');
CREATE TYPE public.user_role AS ENUM ('member', 'admin');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL CHECK (username ~ '^[a-zA-Z0-9_]+$' AND length(username) >= 3 AND length(username) <= 20),
    display_name TEXT NOT NULL CHECK (length(display_name) >= 1 AND length(display_name) <= 50),
    avatar_url TEXT,
    bio TEXT CHECK (length(bio) <= 500),
    status user_status NOT NULL DEFAULT 'pending',
    role user_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rooms table
CREATE TABLE public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 50),
    description TEXT CHECK (length(description) <= 500),
    is_private BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create room_members table
CREATE TABLE public.room_members (
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (room_id, user_id)
);

-- Create files table
CREATE TABLE public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    uploader_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL CHECK (mime_type IN ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')),
    size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760), -- 10MB max
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_username TEXT NOT NULL, -- denormalized for performance
    content TEXT CHECK ((content IS NOT NULL AND length(content) > 0) OR file_id IS NOT NULL),
    file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create reports table
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (length(reason) >= 1 AND length(reason) <= 500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create security definer functions
CREATE OR REPLACE FUNCTION public.get_current_user_status()
RETURNS user_status AS $$
    SELECT status FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_room_member(room_uuid UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.room_members 
        WHERE room_id = room_uuid AND user_id = auth.uid()
    );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies for profiles
CREATE POLICY "Users can view active profiles and own profile"
ON public.profiles FOR SELECT
USING (
    auth.uid() = id OR 
    (status = 'active' AND public.get_current_user_status() = 'active')
);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND status = 'active');

CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING (public.get_current_user_role() = 'admin');

-- RLS Policies for rooms
CREATE POLICY "Active users can view rooms they are members of"
ON public.rooms FOR SELECT
USING (
    public.get_current_user_status() = 'active' AND
    public.is_room_member(id)
);

CREATE POLICY "Admins can insert rooms"
ON public.rooms FOR INSERT
WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update rooms"
ON public.rooms FOR UPDATE
USING (public.get_current_user_role() = 'admin');

-- RLS Policies for room_members
CREATE POLICY "Users can view room memberships for their rooms"
ON public.room_members FOR SELECT
USING (
    public.get_current_user_status() = 'active' AND
    public.is_room_member(room_id)
);

CREATE POLICY "Admins can manage room memberships"
ON public.room_members FOR ALL
USING (public.get_current_user_role() = 'admin');

-- RLS Policies for messages
CREATE POLICY "Room members can view messages"
ON public.messages FOR SELECT
USING (
    public.get_current_user_status() = 'active' AND
    public.is_room_member(room_id) AND
    deleted_at IS NULL
);

CREATE POLICY "Room members can insert messages"
ON public.messages FOR INSERT
WITH CHECK (
    public.get_current_user_status() = 'active' AND
    public.is_room_member(room_id)
);

CREATE POLICY "Users can edit own messages within 5 minutes"
ON public.messages FOR UPDATE
USING (
    sender_id = auth.uid() AND
    created_at > now() - interval '5 minutes'
);

CREATE POLICY "Admins can update/delete any message"
ON public.messages FOR UPDATE
USING (public.get_current_user_role() = 'admin');

-- RLS Policies for files
CREATE POLICY "Room members can view files"
ON public.files FOR SELECT
USING (
    public.get_current_user_status() = 'active' AND
    public.is_room_member(room_id)
);

CREATE POLICY "Room members can upload files"
ON public.files FOR INSERT
WITH CHECK (
    public.get_current_user_status() = 'active' AND
    public.is_room_member(room_id)
);

-- RLS Policies for reports
CREATE POLICY "Admins can view all reports"
ON public.reports FOR SELECT
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Active users can create reports"
ON public.reports FOR INSERT
WITH CHECK (
    public.get_current_user_status() = 'active' AND
    public.is_room_member((SELECT room_id FROM public.messages WHERE id = message_id))
);

-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public) VALUES ('room-files', 'room-files', false);

-- Storage RLS policies
CREATE POLICY "Room members can view files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'room-files' AND
    public.get_current_user_status() = 'active' AND
    EXISTS (
        SELECT 1 FROM public.files f
        WHERE f.storage_path = name AND public.is_room_member(f.room_id)
    )
);

CREATE POLICY "Room members can upload files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'room-files' AND
    public.get_current_user_status() = 'active'
);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text from 1 for 8)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', 'New User')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for necessary tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Create indexes for performance
CREATE INDEX idx_messages_room_id_created_at ON public.messages(room_id, created_at);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_room_members_user_id ON public.room_members(user_id);
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_status ON public.profiles(status);

-- Insert seed data
-- Create admin user (will need manual password setup)
INSERT INTO public.profiles (id, username, display_name, status, role) 
VALUES (
    gen_random_uuid(), 
    'admin', 
    'Administrator', 
    'active', 
    'admin'
) ON CONFLICT (username) DO NOTHING;

-- Create general room
INSERT INTO public.rooms (id, name, description, is_private, created_by)
VALUES (
    gen_random_uuid(),
    'General',
    'General discussion room for all members',
    true,
    (SELECT id FROM public.profiles WHERE username = 'admin')
);