-- CreateEnum
CREATE TYPE "recall_status" AS ENUM ('open', 'completed', 'not_applicable');

-- AlterTable
ALTER TABLE "registrations" ADD COLUMN "recalls_checked_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "registration_recalls" (
    "id" TEXT NOT NULL,
    "registration_id" TEXT NOT NULL,
    "nhtsa_campaign_number" TEXT NOT NULL,
    "manufacturer" TEXT,
    "component" TEXT,
    "summary" TEXT,
    "consequence" TEXT,
    "remedy" TEXT,
    "notes_from_nhtsa" TEXT,
    "report_received_date" TEXT,
    "park_it" BOOLEAN NOT NULL DEFAULT false,
    "park_outside" BOOLEAN NOT NULL DEFAULT false,
    "over_the_air_update" BOOLEAN NOT NULL DEFAULT false,
    "status" "recall_status" NOT NULL DEFAULT 'open',
    "user_notes" TEXT,
    "completed_at" TIMESTAMP(3),
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_recalls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registration_recalls_registration_id_idx" ON "registration_recalls"("registration_id");

-- CreateIndex
CREATE INDEX "registration_recalls_registration_id_status_idx" ON "registration_recalls"("registration_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "registration_recalls_registration_id_nhtsa_campaign_number_key" ON "registration_recalls"("registration_id", "nhtsa_campaign_number");

-- AddForeignKey
ALTER TABLE "registration_recalls" ADD CONSTRAINT "registration_recalls_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
