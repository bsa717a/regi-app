-- App-level roles on consumer users (admin can manage the portal).
CREATE TYPE "app_role" AS ENUM ('user', 'admin');

ALTER TABLE "users" ADD COLUMN "role" "app_role" NOT NULL DEFAULT 'user';

UPDATE "users" AS u
SET "role" = 'admin'
WHERE EXISTS (
  SELECT 1
  FROM "staff_users" AS s
  WHERE s.firebase_uid = u.firebase_uid
);
