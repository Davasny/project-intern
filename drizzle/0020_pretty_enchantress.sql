ALTER TABLE "project" ALTER COLUMN "default_temperature" SET DEFAULT 0.5;
UPDATE "project" SET "default_temperature" = 0.5 WHERE "default_temperature" = 1;
