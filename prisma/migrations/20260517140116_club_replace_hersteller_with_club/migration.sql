-- Ersetzt `hersteller` durch ein freies `club`-Feld (z.B. "7", "PW", "Driver").
-- Bestehende Hersteller-Werte werden in `modell` gemerged, damit kein Datenverlust.

ALTER TABLE "clubs" ADD COLUMN "club" TEXT;

UPDATE "clubs"
SET "modell" = NULLIF(TRIM(CONCAT("hersteller", ' ', "modell")), ''),
    "club"   = ''
WHERE "club" IS NULL;

ALTER TABLE "clubs" ALTER COLUMN "club" SET NOT NULL;
ALTER TABLE "clubs" DROP COLUMN "hersteller";
