-- Defense-in-depth: change the column DEFAULT for legacy password fields from
-- plaintext "123456" to a bcrypt hash of "123456", so any insert path that
-- omits the field (application code always sets it explicitly now) never
-- stores plaintext. This does NOT change any existing row values — run
-- scripts/migrate-hash-passwords.ts separately to hash existing rows.

ALTER TABLE "HeadmasterStaff" ALTER COLUMN "password" SET DEFAULT '$2b$10$672zWrwIOxXoaL.Eh9iZhubuyoMM1/Gc3UJzBJTt45rBRN6ci/Tn2';
ALTER TABLE "HeadmasterTempStaff" ALTER COLUMN "password" SET DEFAULT '$2b$10$672zWrwIOxXoaL.Eh9iZhubuyoMM1/Gc3UJzBJTt45rBRN6ci/Tn2';
ALTER TABLE "HeadmasterParent" ALTER COLUMN "password" SET DEFAULT '$2b$10$672zWrwIOxXoaL.Eh9iZhubuyoMM1/Gc3UJzBJTt45rBRN6ci/Tn2';
