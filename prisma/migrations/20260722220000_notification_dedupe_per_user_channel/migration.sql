-- Reminder dispatch needs one row per user × channel (email/push).
-- Replace the vehicle-only uniqueness with a fuller composite key.
-- Idempotency still also enforced by notifications.dedupe_key.

DROP INDEX "notifications_vehicle_id_template_key_scheduled_for_key";

CREATE UNIQUE INDEX "notifications_user_id_vehicle_id_channel_template_key_scheduled_for_key" ON "notifications"("user_id", "vehicle_id", "channel", "template_key", "scheduled_for");
