-- Enable RLS on all application tables.
-- Prisma connects via a direct service-role connection and bypasses RLS,
-- so these policies are defense-in-depth — they block any direct anon/user-key
-- access via the Supabase client that doesn't go through the app.
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_holes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- rounds: owner only
CREATE POLICY "rounds_select" ON public.rounds FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "rounds_insert" ON public.rounds FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "rounds_update" ON public.rounds FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "rounds_delete" ON public.rounds FOR DELETE USING (auth.uid()::text = user_id);

-- round_holes: access via parent round ownership
CREATE POLICY "round_holes_select" ON public.round_holes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.rounds WHERE id = round_id AND auth.uid()::text = user_id)
);
CREATE POLICY "round_holes_insert" ON public.round_holes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.rounds WHERE id = round_id AND auth.uid()::text = user_id)
);
CREATE POLICY "round_holes_update" ON public.round_holes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.rounds WHERE id = round_id AND auth.uid()::text = user_id)
);
CREATE POLICY "round_holes_delete" ON public.round_holes FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.rounds WHERE id = round_id AND auth.uid()::text = user_id)
);

-- clubs: owner only
CREATE POLICY "clubs_select" ON public.clubs FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "clubs_insert" ON public.clubs FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "clubs_update" ON public.clubs FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "clubs_delete" ON public.clubs FOR DELETE USING (auth.uid()::text = user_id);
