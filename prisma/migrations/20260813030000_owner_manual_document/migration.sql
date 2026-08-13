-- AlterTable
ALTER TABLE "registrations" ADD COLUMN "owner_manual_document_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "registrations_owner_manual_document_id_key" ON "registrations"("owner_manual_document_id");

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_owner_manual_document_id_fkey" FOREIGN KEY ("owner_manual_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
