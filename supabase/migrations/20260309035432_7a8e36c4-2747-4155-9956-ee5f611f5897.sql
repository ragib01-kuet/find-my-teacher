
ALTER TABLE public.tutor_profiles ADD COLUMN IF NOT EXISTS university_name text DEFAULT 'KUET';
ALTER TABLE public.tutor_profiles ADD COLUMN IF NOT EXISTS id_card_url text;
