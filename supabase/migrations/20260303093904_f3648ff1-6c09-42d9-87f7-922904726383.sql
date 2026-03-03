
-- Update handle_new_user to support auto-approval for @stud.kuet.ac.bd, admin for specific email, and phone storage
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role app_role;
  _email text;
  _phone text;
  _department text;
  _batch text;
BEGIN
  _email := NEW.email;
  _phone := NEW.raw_user_meta_data->>'phone';
  _department := NEW.raw_user_meta_data->>'department';
  _batch := NEW.raw_user_meta_data->>'batch';
  
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
  
  -- If tutor with @stud.kuet.ac.bd email, auto-create approved tutor profile
  IF _role = 'tutor' AND _email LIKE '%@stud.kuet.ac.bd' THEN
    INSERT INTO public.tutor_profiles (user_id, department, session, status)
    VALUES (NEW.id, COALESCE(_department, 'Unknown'), COALESCE(_batch, 'Unknown'), 'approved');
  ELSIF _role = 'tutor' THEN
    -- Non-KUET email tutors get pending status
    INSERT INTO public.tutor_profiles (user_id, department, session, status)
    VALUES (NEW.id, COALESCE(_department, 'Unknown'), COALESCE(_batch, 'Unknown'), 'pending');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
