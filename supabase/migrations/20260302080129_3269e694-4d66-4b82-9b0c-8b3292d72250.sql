
-- Add reply_to_id to messages for reply feature
ALTER TABLE public.messages ADD COLUMN reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

-- Create message_reactions table
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS: participants can view reactions on messages they can see
CREATE POLICY "View reactions" ON public.message_reactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.tuition_requests tr ON tr.id = m.request_id
    WHERE m.id = message_reactions.message_id
    AND (auth.uid() = tr.student_id OR auth.uid() = tr.tutor_id OR public.has_role(auth.uid(), 'admin'))
  )
);

-- RLS: authenticated users can add reactions to messages they can see
CREATE POLICY "Add reactions" ON public.message_reactions
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.tuition_requests tr ON tr.id = m.request_id
    WHERE m.id = message_reactions.message_id
    AND (auth.uid() = tr.student_id OR auth.uid() = tr.tutor_id)
    AND tr.status = 'accepted'
  )
);

-- RLS: users can remove their own reactions
CREATE POLICY "Remove own reactions" ON public.message_reactions
FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for message_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
