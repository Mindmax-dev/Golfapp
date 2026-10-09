ALTER TABLE "swing_videos"
ADD COLUMN "analysis_data" JSONB;

ALTER TABLE "swing_videos"
ADD CONSTRAINT "swing_videos_analysis_data_object_check"
CHECK (
    "analysis_data" IS NULL
    OR jsonb_typeof("analysis_data") = 'object'
);
