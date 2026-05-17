-- WHS-based handicap fields (all nullable — existing rows untouched).

-- Round-level computed fields
ALTER TABLE "rounds"
  ADD COLUMN "course_handicap" INTEGER,
  ADD COLUMN "adjusted_gross_score" INTEGER,
  ADD COLUMN "score_differential" DECIMAL(4,1),
  ADD COLUMN "total_stableford_points" INTEGER,
  ADD COLUMN "handicap_index_before_round" DECIMAL(4,1),
  ADD COLUMN "handicap_index_after_round" DECIMAL(4,1);

-- Per-hole computed fields + optional putts
ALTER TABLE "round_holes"
  ADD COLUMN "putts" INTEGER,
  ADD COLUMN "handicap_strokes" INTEGER,
  ADD COLUMN "adjusted_score" INTEGER,
  ADD COLUMN "net_score" INTEGER,
  ADD COLUMN "stableford_points" INTEGER;

-- User profile holds official and internal Handicap Index
CREATE TABLE "user_profiles" (
    "user_id" TEXT NOT NULL,
    "official_handicap_index" DECIMAL(4,1),
    "internal_handicap_index" DECIMAL(4,1),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- RLS: defense-in-depth — Prisma uses service role and bypasses these,
-- but block direct anon access via Supabase client (same pattern as other tables).
ALTER TABLE golf.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_select" ON golf.user_profiles FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "user_profiles_insert" ON golf.user_profiles FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "user_profiles_update" ON golf.user_profiles FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "user_profiles_delete" ON golf.user_profiles FOR DELETE USING (auth.uid()::text = user_id);
