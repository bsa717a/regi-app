-- CreateEnum
CREATE TYPE "vehicle_catalog_status" AS ENUM ('pending', 'ready', 'unavailable');

-- CreateTable
CREATE TABLE "vehicle_catalog_images" (
    "id" TEXT NOT NULL,
    "make_key" TEXT NOT NULL,
    "model_key" TEXT NOT NULL,
    "display_make" TEXT NOT NULL,
    "display_model" TEXT NOT NULL,
    "year_from" INTEGER NOT NULL,
    "year_to" INTEGER NOT NULL,
    "generation_label" TEXT NOT NULL,
    "status" "vehicle_catalog_status" NOT NULL,
    "gcs_path" TEXT,
    "storage_path" TEXT,
    "author" TEXT,
    "license" TEXT,
    "license_url" TEXT,
    "source_url" TEXT,
    "source_title" TEXT,
    "share_alike" BOOLEAN NOT NULL DEFAULT false,
    "retrieved_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_catalog_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_catalog_images_make_key_model_key_idx" ON "vehicle_catalog_images"("make_key", "model_key");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_catalog_generation_key" ON "vehicle_catalog_images"("make_key", "model_key", "year_from", "year_to");
