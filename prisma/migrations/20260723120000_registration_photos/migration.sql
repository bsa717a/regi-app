-- CreateTable
CREATE TABLE IF NOT EXISTS "registration_photos" (
    "id" TEXT NOT NULL,
    "registration_id" TEXT NOT NULL,
    "gcs_path" TEXT NOT NULL,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "registration_photos_registration_id_idx" ON "registration_photos"("registration_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'registration_photos_registration_id_fkey'
  ) THEN
    ALTER TABLE "registration_photos" ADD CONSTRAINT "registration_photos_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Migrate existing single photos into the gallery (photo #1, cover).
INSERT INTO "registration_photos" ("id", "registration_id", "gcs_path", "is_cover", "sort_order", "created_at")
SELECT
    'mig_' || r."id",
    r."id",
    r."photo_gcs_path",
    true,
    0,
    COALESCE(r."updated_at", r."created_at", CURRENT_TIMESTAMP)
FROM "registrations" r
WHERE r."photo_gcs_path" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "registration_photos" p WHERE p."registration_id" = r."id"
  );
