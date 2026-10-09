-- Store searchable metadata separately from the binary video in Supabase Storage.
CREATE TABLE "swing_videos" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "recorded_at" DATE NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "swing_videos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "swing_videos_storage_path_key"
ON "swing_videos"("storage_path");

CREATE INDEX "swing_videos_user_id_recorded_at_idx"
ON "swing_videos"("user_id", "recorded_at" DESC);

CREATE INDEX "swing_videos_recorded_at_created_at_idx"
ON "swing_videos"("recorded_at" DESC, "created_at" DESC);

ALTER TABLE "swing_videos" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "swing_videos_select_own"
ON "swing_videos"
FOR SELECT
TO authenticated
USING ((SELECT auth.uid())::text = "user_id");

CREATE POLICY "swing_videos_insert_own"
ON "swing_videos"
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid())::text = "user_id");

CREATE POLICY "swing_videos_update_own"
ON "swing_videos"
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid())::text = "user_id")
WITH CHECK ((SELECT auth.uid())::text = "user_id");

CREATE POLICY "swing_videos_delete_own"
ON "swing_videos"
FOR DELETE
TO authenticated
USING ((SELECT auth.uid())::text = "user_id");

-- The gallery is public, while object mutations remain scoped to the uploader.
INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES (
    'swing-videos',
    'swing-videos',
    true,
    52428800,
    ARRAY['video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "swing_videos_storage_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'swing-videos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND owner_id = (SELECT auth.uid())::text
);

CREATE POLICY "swing_videos_storage_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'swing-videos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "swing_videos_storage_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'swing-videos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND owner_id = (SELECT auth.uid())::text
);
