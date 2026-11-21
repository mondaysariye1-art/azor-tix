import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum__tickets_v_version_status') THEN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'enum__tickets_v_version_status'
            AND e.enumlabel = 'cancelled'
        ) THEN
          ALTER TYPE "public"."enum__tickets_v_version_status" ADD VALUE 'cancelled';
        END IF;
      END IF;
    END$$;
  `)

  await db.execute(sql`
    ALTER TABLE IF EXISTS "_tickets_v"
      ADD COLUMN IF NOT EXISTS "version_verification_token_hash" varchar,
      ADD COLUMN IF NOT EXISTS "version_verification_token_ciphertext" varchar;
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "_tickets_v_version_version_verification_token_hash_idx"
      ON "_tickets_v" USING btree ("version_verification_token_hash");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "_tickets_v_version_version_verification_token_hash_idx";
    ALTER TABLE IF EXISTS "_tickets_v"
      DROP COLUMN IF EXISTS "version_verification_token_hash",
      DROP COLUMN IF EXISTS "version_verification_token_ciphertext";
  `)
}
