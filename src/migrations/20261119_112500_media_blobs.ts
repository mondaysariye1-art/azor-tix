import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "media_blobs" (
      "media_id" uuid PRIMARY KEY REFERENCES "media"("id") ON DELETE CASCADE,
      "mime_type" varchar,
      "data" bytea NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ai_studio_app_user') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "media_blobs" TO "ai_studio_app_user";
      END IF;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "media_blobs";
  `)
}
