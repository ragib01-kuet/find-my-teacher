-- Fix RLS policies for contracts + contract_signatures
-- This makes contract signing functional for the involved student/tutor.

-- Ensure RLS is enabled (safe if already enabled)
ALTER TABLE IF EXISTS public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contract_signatures ENABLE ROW LEVEL SECURITY;

-- CONTRACTS: involved parties + admin can read
DROP POLICY IF EXISTS "Involved users view contracts" ON public.contracts;
CREATE POLICY "Involved users view contracts"
ON public.contracts
FOR SELECT
TO authenticated
USING (
  auth.uid() = student_id
  OR auth.uid() = tutor_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- CONTRACT SIGNATURES: involved parties + admin can read
DROP POLICY IF EXISTS "Involved users view contract signatures" ON public.contract_signatures;
CREATE POLICY "Involved users view contract signatures"
ON public.contract_signatures
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.contracts c
    WHERE c.id = contract_id
      AND (auth.uid() = c.student_id OR auth.uid() = c.tutor_id)
  )
);

-- CONTRACT SIGNATURES: student/tutor can insert their own signature for that contract
DROP POLICY IF EXISTS "Involved users sign contract" ON public.contract_signatures;
CREATE POLICY "Involved users sign contract"
ON public.contract_signatures
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.contracts c
    WHERE c.id = contract_id
      AND (auth.uid() = c.student_id OR auth.uid() = c.tutor_id)
  )
);

-- Prevent edits after signing (optional safety)
DROP POLICY IF EXISTS "No updates to contract signatures" ON public.contract_signatures;
CREATE POLICY "No updates to contract signatures"
ON public.contract_signatures
FOR UPDATE
TO authenticated
USING (false);

