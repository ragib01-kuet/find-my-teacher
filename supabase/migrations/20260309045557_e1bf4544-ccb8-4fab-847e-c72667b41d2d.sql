-- Create auto_approval_patterns table for configurable email patterns
CREATE TABLE public.auto_approval_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.auto_approval_patterns ENABLE ROW LEVEL SECURITY;

-- RLS policies: Only admins can manage patterns, anyone can read active patterns (for signup function)
CREATE POLICY "Admins can manage patterns" ON public.auto_approval_patterns
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can read patterns" ON public.auto_approval_patterns
  FOR SELECT USING (true);

-- Seed with existing KUET pattern
INSERT INTO public.auto_approval_patterns (pattern, description, is_active)
VALUES ('@stud.kuet.ac.bd', 'KUET student email domain - auto-approved tutors', true);

-- Update the handle_new_user function to use the patterns table
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role;
  _email text;
  _phone text;
  _department text;
  _batch text;
  _university_name text;
  _is_auto_approved boolean := false;
BEGIN
  _email := NEW.email;
  _phone := NEW.raw_user_meta_data->>'phone';
  _department := NEW.raw_user_meta_data->>'department';
  _batch := NEW.raw_user_meta_data->>'batch';
  _university_name := NEW.raw_user_meta_data->>'university_name';
  
  -- Determine role
  IF _email = 'ragibabid.kuet@gmail.com' THEN
    _role := 'admin';
  ELSE
    _role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student');
  END IF;
  
  -- Create profile with phone
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), _phone);
  
  -- Create role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);
  
  -- Check if email matches any active auto-approval pattern
  IF _role = 'tutor' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.auto_approval_patterns
      WHERE is_active = true AND _email LIKE '%' || pattern
    ) INTO _is_auto_approved;
    
    IF _is_auto_approved THEN
      INSERT INTO public.tutor_profiles (user_id, department, session, status, university_name)
      VALUES (NEW.id, COALESCE(_department, 'Unknown'), COALESCE(_batch, 'Unknown'), 'approved', COALESCE(_university_name, 'Unknown'));
    ELSE
      INSERT INTO public.tutor_profiles (user_id, department, session, status, university_name)
      VALUES (NEW.id, COALESCE(_department, 'Unknown'), COALESCE(_batch, 'Unknown'), 'pending', COALESCE(_university_name, 'Unknown'));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;