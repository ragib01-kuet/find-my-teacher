
-- Create demo-videos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('demo-videos', 'demo-videos', true);

-- Storage policies for demo-videos bucket
CREATE POLICY "Tutors upload own demo videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'demo-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.has_role(auth.uid(), 'tutor')
);

CREATE POLICY "Tutors delete own demo videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'demo-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.has_role(auth.uid(), 'tutor')
);

CREATE POLICY "Anyone can view demo videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'demo-videos');

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System inserts notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create demo_video_views table to track views and ratings
CREATE TABLE public.demo_video_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID NOT NULL,
  student_id UUID NOT NULL,
  watched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed BOOLEAN NOT NULL DEFAULT false,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (tutor_id, student_id)
);

ALTER TABLE public.demo_video_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students insert own views"
ON public.demo_video_views FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students update own views"
ON public.demo_video_views FOR UPDATE
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Tutor and admin view demo views"
ON public.demo_video_views FOR SELECT
TO authenticated
USING (auth.uid() = tutor_id OR auth.uid() = student_id OR public.has_role(auth.uid(), 'admin'));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
