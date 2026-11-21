import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'enum_tickets_status'
      ) THEN
        ALTER TYPE "public"."enum_tickets_status" ADD VALUE IF NOT EXISTS 'cancelled';
      END IF;
    END $$;

    ALTER TABLE "tickets"
      ADD COLUMN IF NOT EXISTS "verification_token_hash" varchar,
      ADD COLUMN IF NOT EXISTS "verification_token_ciphertext" varchar;

    CREATE UNIQUE INDEX IF NOT EXISTS "tickets_verification_token_hash_idx"
      ON "tickets" USING btree ("verification_token_hash");

    CREATE INDEX IF NOT EXISTS "tickets_event_status_idx"
      ON "tickets" USING btree ("event_id", "status");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "tickets_event_status_idx";
    DROP INDEX IF EXISTS "tickets_verification_token_hash_idx";
    ALTER TABLE "tickets"
      DROP COLUMN IF EXISTS "verification_token_ciphertext",
      DROP COLUMN IF EXISTS "verification_token_hash";
  `)
}
