-- Mailing address for sticker delivery and DMV correspondence.
ALTER TABLE "users" ADD COLUMN "address_line1" TEXT;
ALTER TABLE "users" ADD COLUMN "address_line2" TEXT;
ALTER TABLE "users" ADD COLUMN "city" TEXT;
ALTER TABLE "users" ADD COLUMN "address_state" CHAR(2);
ALTER TABLE "users" ADD COLUMN "postal_code" TEXT;
