-- CreateEnum
CREATE TYPE "regi_chat_role" AS ENUM ('user', 'assistant');

-- CreateTable
CREATE TABLE "regi_chat_messages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "regi_chat_role" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regi_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "regi_chat_messages_user_id_created_at_idx" ON "regi_chat_messages"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "regi_chat_messages" ADD CONSTRAINT "regi_chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
