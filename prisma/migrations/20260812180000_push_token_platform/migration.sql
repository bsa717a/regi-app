-- CreateEnum
CREATE TYPE "push_platform" AS ENUM ('web', 'ios', 'android');

-- AlterTable
ALTER TABLE "push_tokens" ADD COLUMN "platform" "push_platform" NOT NULL DEFAULT 'web';
