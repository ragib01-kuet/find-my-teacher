-- Add UPDATE and DELETE policies for admin on auto_approval_patterns
-- The existing "Admins can manage patterns" FOR ALL policy already covers UPDATE and DELETE for admins.
-- But we need INSERT for admins specifically (the FOR ALL should cover it, let's verify by adding explicit)
-- Actually the FOR ALL policy covers all operations. Let's just add a WITH CHECK for the ALL policy.
-- The existing policy is fine. No changes needed.
SELECT 1;