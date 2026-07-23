-- CreateEnum
CREATE TYPE "registration_type" AS ENUM ('passenger', 'motorcycle', 'trailer', 'ohv', 'snowmobile', 'boat');

-- Rename vehicles → registrations
ALTER TABLE "vehicles" RENAME TO "registrations";

-- Add type + details
ALTER TABLE "registrations" ADD COLUMN "type" "registration_type";
UPDATE "registrations" SET "type" = 'passenger' WHERE "type" IS NULL;
ALTER TABLE "registrations" ALTER COLUMN "type" SET NOT NULL;
ALTER TABLE "registrations" ADD COLUMN "details" JSONB NOT NULL DEFAULT '{}';

-- Rename constraints / indexes on registrations
ALTER TABLE "registrations" RENAME CONSTRAINT "vehicles_pkey" TO "registrations_pkey";
ALTER TABLE "registrations" RENAME CONSTRAINT "vehicles_household_id_fkey" TO "registrations_household_id_fkey";
ALTER TABLE "registrations" RENAME CONSTRAINT "vehicles_created_by_fkey" TO "registrations_created_by_fkey";
ALTER INDEX "vehicles_household_id_idx" RENAME TO "registrations_household_id_idx";
ALTER INDEX "vehicles_created_by_idx" RENAME TO "registrations_created_by_idx";
ALTER INDEX "vehicles_registration_expires_on_idx" RENAME TO "registrations_registration_expires_on_idx";
ALTER INDEX "vehicles_state_idx" RENAME TO "registrations_state_idx";
CREATE INDEX "registrations_type_idx" ON "registrations"("type");

-- Renewals: vehicle_id → registration_id
ALTER TABLE "renewals" DROP CONSTRAINT "renewals_vehicle_id_fkey";
ALTER TABLE "renewals" RENAME COLUMN "vehicle_id" TO "registration_id";
ALTER INDEX "renewals_vehicle_id_idx" RENAME TO "renewals_registration_id_idx";
ALTER INDEX IF EXISTS "renewals_one_open_per_vehicle" RENAME TO "renewals_one_open_per_registration";
ALTER TABLE "renewals" ADD CONSTRAINT "renewals_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Documents: vehicle_id → registration_id
ALTER TABLE "documents" DROP CONSTRAINT "documents_vehicle_id_fkey";
ALTER TABLE "documents" RENAME COLUMN "vehicle_id" TO "registration_id";
ALTER INDEX "documents_vehicle_id_idx" RENAME TO "documents_registration_id_idx";
ALTER TABLE "documents" ADD CONSTRAINT "documents_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Notifications: vehicle_id → registration_id
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_vehicle_id_fkey";
DROP INDEX "notifications_user_id_vehicle_id_channel_template_key_scheduled_for_key";
ALTER TABLE "notifications" RENAME COLUMN "vehicle_id" TO "registration_id";
ALTER INDEX "notifications_vehicle_id_idx" RENAME TO "notifications_registration_id_idx";
CREATE UNIQUE INDEX "notifications_user_id_registration_id_channel_template_key_scheduled_for_key" ON "notifications"("user_id", "registration_id", "channel", "template_key", "scheduled_for");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
