-- Enable RLS on all application tables.
-- Prisma connects via a direct service-role connection and bypasses RLS,
-- so these policies are defense-in-depth — they block any direct anon/user-key
-- access via the Supabase client that doesn't go through the app.
ALTER TABLE golf.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf.round_holes ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf.clubs ENABLE ROW LEVEL SECURITY;

-- rounds: owner only
CREATE POLICY "rounds_select" ON golf.rounds FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "rounds_insert" ON golf.rounds FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "rounds_update" ON golf.rounds FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "rounds_delete" ON golf.rounds FOR DELETE USING (auth.uid()::text = user_id);

-- round_holes: access via parent round ownership
CREATE POLICY "round_holes_select" ON golf.round_holes FOR SELECT USING (
  EXISTS (SELECT 1 FROM golf.rounds WHERE id = round_id AND auth.uid()::text = user_id)
);
CREATE POLICY "round_holes_insert" ON golf.round_holes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM golf.rounds WHERE id = round_id AND auth.uid()::text = user_id)
);
CREATE POLICY "round_holes_update" ON golf.round_holes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM golf.rounds WHERE id = round_id AND auth.uid()::text = user_id)
);
CREATE POLICY "round_holes_delete" ON golf.round_holes FOR DELETE USING (
  EXISTS (SELECT 1 FROM golf.rounds WHERE id = round_id AND auth.uid()::text = user_id)
);

-- clubs: owner only
CREATE POLICY "clubs_select" ON golf.clubs FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "clubs_insert" ON golf.clubs FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "clubs_update" ON golf.clubs FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "clubs_delete" ON golf.clubs FOR DELETE USING (auth.uid()::text = user_id);
