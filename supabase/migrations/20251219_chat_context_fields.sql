-- Migration: Add Context Menu Fields to Messages Table

-- 1. Add new columns
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.messages(id);

-- 2. Row Level Security Updates

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Senders can UPDATE their own messages (Edit/Delete/Pin)
CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

-- Policy: Senders can DELETE their own messages (Hard delete, though we prefer soft)
CREATE POLICY "Users can delete their own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- Note: Existing INSERT/SELECT policies should already be present.
-- If not, basic ones are:
-- CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT ...
-- CREATE POLICY "Users can insert messages" ON public.messages FOR INSERT ...
