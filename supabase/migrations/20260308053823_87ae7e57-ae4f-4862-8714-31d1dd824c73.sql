
-- Fix the overly permissive notification insert policy
DROP POLICY "System inserts notifications" ON public.notifications;

CREATE POLICY "Authenticated users insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
