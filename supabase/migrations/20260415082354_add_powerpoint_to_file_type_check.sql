ALTER TABLE public.content_items DROP CONSTRAINT IF EXISTS content_items_file_type_check;
ALTER TABLE public.content_items ADD CONSTRAINT content_items_file_type_check CHECK (file_type IN ('video', 'pdf', 'image', 'powerpoint', 'unknown'));;
