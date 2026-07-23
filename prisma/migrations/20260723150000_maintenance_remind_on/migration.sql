-- AlterTable
ALTER TABLE "maintenance_tasks" ADD COLUMN "remind_on" DATE;

-- CreateIndex
CREATE INDEX "maintenance_tasks_remind_on_idx" ON "maintenance_tasks"("remind_on");
