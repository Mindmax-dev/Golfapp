-- Manually-maintained history of official DGV handicap values.
-- The user records dated entries; the latest entry on or before a round's date is
-- treated as that round's official HI for chart display.

CREATE TABLE "official_handicap_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "datum" DATE NOT NULL,
    "handicap_index" DECIMAL(4,1) NOT NULL,
    "notiz" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "official_handicap_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "official_handicap_entries_user_id_datum_idx"
  ON "official_handicap_entries" ("user_id", "datum");

ALTER TABLE golf.official_handicap_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "official_handicap_entries_select" ON golf.official_handicap_entries
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "official_handicap_entries_insert" ON golf.official_handicap_entries
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "official_handicap_entries_update" ON golf.official_handicap_entries
  FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "official_handicap_entries_delete" ON golf.official_handicap_entries
  FOR DELETE USING (auth.uid()::text = user_id);
