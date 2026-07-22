-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "member_role" AS ENUM ('owner', 'viewer');

-- CreateEnum
CREATE TYPE "invite_status" AS ENUM ('pending', 'accepted', 'declined');

-- CreateEnum
CREATE TYPE "renewal_status" AS ENUM ('Requested', 'DocumentsReceived', 'Reviewing', 'Processing', 'Submitted', 'Completed', 'StickerMailed');

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('registration', 'insurance', 'title', 'emissions', 'temp_permit');

-- CreateEnum
CREATE TYPE "notification_channel" AS ENUM ('push', 'email', 'sms');

-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('pending', 'sent', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pending', 'requires_action', 'succeeded', 'failed', 'refunded', 'cancelled');

-- CreateEnum
CREATE TYPE "staff_role" AS ENUM ('admin', 'agent');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "firebase_uid" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "notification_prefs" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "households" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_members" (
    "household_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "member_role" NOT NULL,
    "invite_status" "invite_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "household_members_pkey" PRIMARY KEY ("household_id","user_id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "vin" TEXT,
    "plate" TEXT,
    "state" CHAR(2) NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "nickname" TEXT,
    "photo_url" TEXT,
    "body_class" TEXT,
    "registration_expires_on" DATE NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "state_rules" (
    "state_code" CHAR(2) NOT NULL,
    "config" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "state_rules_pkey" PRIMARY KEY ("state_code")
);

-- CreateTable
CREATE TABLE "renewals" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "status" "renewal_status" NOT NULL DEFAULT 'Requested',
    "requested_by" TEXT NOT NULL,
    "fee_breakdown" JSONB NOT NULL DEFAULT '{}',
    "stripe_payment_intent_id" TEXT,
    "staff_notes" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documents_received_at" TIMESTAMP(3),
    "reviewing_at" TIMESTAMP(3),
    "processing_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "sticker_mailed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "renewals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "renewal_id" TEXT,
    "type" "document_type" NOT NULL,
    "gcs_path" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "channel" "notification_channel" NOT NULL,
    "template_key" TEXT NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "status" "notification_status" NOT NULL DEFAULT 'pending',
    "dedupe_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "renewal_id" TEXT NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "stripe_charge_id" TEXT,
    "stripe_customer_id" TEXT,
    "amount" INTEGER NOT NULL,
    "registration_fee_amount" INTEGER NOT NULL DEFAULT 0,
    "regi_service_fee_amount" INTEGER NOT NULL DEFAULT 0,
    "late_fee_amount" INTEGER NOT NULL DEFAULT 0,
    "status" "payment_status" NOT NULL DEFAULT 'pending',
    "receipt_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_users" (
    "id" TEXT NOT NULL,
    "firebase_uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "staff_role" NOT NULL DEFAULT 'agent',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "state" CHAR(2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "households_owner_user_id_idx" ON "households"("owner_user_id");

-- CreateIndex
CREATE INDEX "household_members_user_id_idx" ON "household_members"("user_id");

-- CreateIndex
CREATE INDEX "vehicles_household_id_idx" ON "vehicles"("household_id");

-- CreateIndex
CREATE INDEX "vehicles_created_by_idx" ON "vehicles"("created_by");

-- CreateIndex
CREATE INDEX "vehicles_registration_expires_on_idx" ON "vehicles"("registration_expires_on");

-- CreateIndex
CREATE INDEX "vehicles_state_idx" ON "vehicles"("state");

-- CreateIndex
CREATE INDEX "renewals_vehicle_id_idx" ON "renewals"("vehicle_id");

-- CreateIndex
CREATE INDEX "renewals_requested_by_idx" ON "renewals"("requested_by");

-- CreateIndex
CREATE INDEX "renewals_status_idx" ON "renewals"("status");

-- CreateIndex
CREATE INDEX "documents_vehicle_id_idx" ON "documents"("vehicle_id");

-- CreateIndex
CREATE INDEX "documents_renewal_id_idx" ON "documents"("renewal_id");

-- CreateIndex
CREATE INDEX "documents_uploaded_by_idx" ON "documents"("uploaded_by");

-- CreateIndex
CREATE INDEX "documents_type_idx" ON "documents"("type");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_vehicle_id_idx" ON "notifications"("vehicle_id");

-- CreateIndex
CREATE INDEX "notifications_scheduled_for_idx" ON "notifications"("scheduled_for");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_vehicle_id_template_key_scheduled_for_key" ON "notifications"("vehicle_id", "template_key", "scheduled_for");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_renewal_id_idx" ON "payments"("renewal_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "staff_users_firebase_uid_key" ON "staff_users"("firebase_uid");

-- CreateIndex
CREATE INDEX "audit_log_actor_idx" ON "audit_log"("actor");

-- CreateIndex
CREATE INDEX "audit_log_entity_idx" ON "audit_log"("entity");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- CreateIndex
CREATE INDEX "waitlist_state_idx" ON "waitlist"("state");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_email_state_key" ON "waitlist"("email", "state");

-- AddForeignKey
ALTER TABLE "households" ADD CONSTRAINT "households_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewals" ADD CONSTRAINT "renewals_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewals" ADD CONSTRAINT "renewals_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_renewal_id_fkey" FOREIGN KEY ("renewal_id") REFERENCES "renewals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_renewal_id_fkey" FOREIGN KEY ("renewal_id") REFERENCES "renewals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

