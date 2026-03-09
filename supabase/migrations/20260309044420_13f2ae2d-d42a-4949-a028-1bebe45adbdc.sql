
-- Allow students to insert deals (for auto-approval flow)
DROP POLICY IF EXISTS "Admins manage deals" ON public.deals;
CREATE POLICY "Authenticated users create deals" ON public.deals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

-- Allow involved users to update deals (for status changes)
DROP POLICY IF EXISTS "Admins update deals" ON public.deals;
CREATE POLICY "Involved users update deals" ON public.deals
  FOR UPDATE TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = tutor_id OR has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for contracts and contract_signatures
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_signatures;
