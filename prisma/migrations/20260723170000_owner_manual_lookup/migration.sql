-- CreateEnum
CREATE TYPE "owner_manual_source" AS ENUM ('free', 'paid');

-- CreateEnum
CREATE TYPE "manual_lookup_status" AS ENUM ('pending_payment', 'paid', 'fulfilled', 'cancelled', 'failed');

-- AlterTable
ALTER TABLE "registrations" ADD COLUMN     "owner_manual_url" TEXT,
ADD COLUMN     "owner_manual_source" "owner_manual_source",
ADD COLUMN     "owner_manual_found_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "manual_lookup_requests" (
    "id" TEXT NOT NULL,
    "registration_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "status" "manual_lookup_status" NOT NULL DEFAULT 'pending_payment',
    "fee_cents" INTEGER NOT NULL,
    "provider" TEXT,
    "result_url" TEXT,
    "stripe_payment_intent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_lookup_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "manual_lookup_requests_registration_id_idx" ON "manual_lookup_requests"("registration_id");

-- CreateIndex
CREATE INDEX "manual_lookup_requests_requested_by_idx" ON "manual_lookup_requests"("requested_by");

-- CreateIndex
CREATE INDEX "manual_lookup_requests_status_idx" ON "manual_lookup_requests"("status");

-- AddForeignKey
ALTER TABLE "manual_lookup_requests" ADD CONSTRAINT "manual_lookup_requests_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_lookup_requests" ADD CONSTRAINT "manual_lookup_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
