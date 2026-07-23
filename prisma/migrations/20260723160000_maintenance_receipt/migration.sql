-- AlterTable
ALTER TABLE "maintenance_logs" ADD COLUMN "receipt_gcs_path" TEXT;
ALTER TABLE "maintenance_logs" ADD COLUMN "receipt_filename" TEXT;
