-- Household sharing: member id PK, nullable user_id for pending invites, invite token/email.

ALTER TABLE "household_members" ADD COLUMN "id" TEXT;
ALTER TABLE "household_members" ADD COLUMN "invite_email" TEXT;
ALTER TABLE "household_members" ADD COLUMN "invite_token" TEXT;

UPDATE "household_members"
SET "id" = 'hm_' || replace(gen_random_uuid()::text, '-', '')
WHERE "id" IS NULL;

ALTER TABLE "household_members" ALTER COLUMN "id" SET NOT NULL;

ALTER TABLE "household_members" DROP CONSTRAINT "household_members_pkey";
ALTER TABLE "household_members" DROP CONSTRAINT "household_members_user_id_fkey";

ALTER TABLE "household_members" ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "household_members" ADD CONSTRAINT "household_members_pkey" PRIMARY KEY ("id");

CREATE UNIQUE INDEX "household_members_household_id_user_id_key" ON "household_members"("household_id", "user_id");
CREATE UNIQUE INDEX "household_members_household_id_invite_email_key" ON "household_members"("household_id", "invite_email");
CREATE UNIQUE INDEX "household_members_invite_token_key" ON "household_members"("invite_token");
CREATE INDEX "household_members_invite_email_idx" ON "household_members"("invite_email");

ALTER TABLE "household_members" ADD CONSTRAINT "household_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
