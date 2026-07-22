-- Unique owner: at most one owned household per user (household-of-one race guard)
DROP INDEX IF EXISTS "households_owner_user_id_idx";
CREATE UNIQUE INDEX "households_owner_user_id_key" ON "households"("owner_user_id");

-- At most one open concierge renewal per vehicle (status != StickerMailed)
CREATE UNIQUE INDEX "renewals_one_open_per_vehicle"
ON "renewals"("vehicle_id")
WHERE "status" <> 'StickerMailed';
