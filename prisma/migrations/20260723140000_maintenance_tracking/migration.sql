-- CreateTable
CREATE TABLE "maintenance_tasks" (
    "id" TEXT NOT NULL,
    "registration_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "preset_key" TEXT,
    "interval_months" INTEGER,
    "interval_hours" DOUBLE PRECISION,
    "interval_miles" DOUBLE PRECISION,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_logs" (
    "id" TEXT NOT NULL,
    "registration_id" TEXT NOT NULL,
    "task_id" TEXT,
    "performed_on" DATE NOT NULL,
    "hours_at_service" DOUBLE PRECISION,
    "miles_at_service" DOUBLE PRECISION,
    "cost_cents" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_readings" (
    "id" TEXT NOT NULL,
    "registration_id" TEXT NOT NULL,
    "reading_on" DATE NOT NULL,
    "hours" DOUBLE PRECISION,
    "miles" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_readings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "maintenance_tasks_registration_id_idx" ON "maintenance_tasks"("registration_id");

-- CreateIndex
CREATE INDEX "maintenance_tasks_registration_id_active_idx" ON "maintenance_tasks"("registration_id", "active");

-- CreateIndex
CREATE INDEX "maintenance_logs_registration_id_idx" ON "maintenance_logs"("registration_id");

-- CreateIndex
CREATE INDEX "maintenance_logs_task_id_idx" ON "maintenance_logs"("task_id");

-- CreateIndex
CREATE INDEX "maintenance_logs_performed_on_idx" ON "maintenance_logs"("performed_on");

-- CreateIndex
CREATE INDEX "usage_readings_registration_id_idx" ON "usage_readings"("registration_id");

-- CreateIndex
CREATE INDEX "usage_readings_registration_id_reading_on_idx" ON "usage_readings"("registration_id", "reading_on");

-- AddForeignKey
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "maintenance_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_readings" ADD CONSTRAINT "usage_readings_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
