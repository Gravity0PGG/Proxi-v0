-- 1. Create the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    username text,
    avatar_url text,
    updated_at timestamp with time zone DEFAULT now(),
    has_story boolean DEFAULT false,
    display_name text,
    bio text,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

-- 2. Create the messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    content text NOT NULL,
    sender_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    deleted_for text[] DEFAULT '{}'::text[],
    is_deleted boolean DEFAULT false,
    conversation_id text,
    is_edited boolean DEFAULT false,
    is_forwarded boolean DEFAULT false,
    is_pinned boolean DEFAULT false,
    receiver_id text,
    type text DEFAULT 'text'::text,
    PRIMARY KEY (id)
);

-- 3. Restore your old user profile!
INSERT INTO public.profiles (id, username, avatar_url, updated_at, has_story, display_name, bio, created_at) 
VALUES ('7b7f45df-f4b3-47ee-977b-8b835dc5c821', 'gravity', 'https://bhqqsvonebajrebewsku.supabase.co/storage/v1/object/public/avatars/7b7f45df-f4b3-47ee-977b-8b835dc5c821-p2mvq.jpg', '2025-12-23 23:58:22.568+00', false, 'Gravity', 'Yeah Just Gravity Here\n#founderofthisapp \nIf ur wondering🥸', '2025-12-23 21:41:01.936918+00')
ON CONFLICT (id) DO NOTHING;
