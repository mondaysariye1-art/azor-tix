import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'enum_free_ticket_links_status'
      ) THEN
        ALTER TYPE "public"."enum_free_ticket_links_status" ADD VALUE IF NOT EXISTS 'exhausted';
      END IF;
      IF EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'enum__free_ticket_links_v_version_status'
      ) THEN
        ALTER TYPE "public"."enum__free_ticket_links_v_version_status" ADD VALUE IF NOT EXISTS 'exhausted';
      END IF;
    END $$;

    -- Allow private free invitations & invitation tickets without coupling to public ticket_types
    ALTER TABLE "free_ticket_links" ALTER COLUMN "ticket_type_id" DROP NOT NULL;
    ALTER TABLE "_free_ticket_links_v" ALTER COLUMN "version_ticket_type_id" DROP NOT NULL;
    ALTER TABLE "tickets" ALTER COLUMN "ticket_type_id" DROP NOT NULL;
    ALTER TABLE "_tickets_v" ALTER COLUMN "version_ticket_type_id" DROP NOT NULL;
    ALTER TABLE "orders_items" ALTER COLUMN "ticket_type_id" DROP NOT NULL;
    ALTER TABLE "_orders_v_version_items" ALTER COLUMN "ticket_type_id" DROP NOT NULL;

    -- Orders: self vs gift purchase tracking & email delivery telemetry
    ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "purchase_mode" varchar DEFAULT 'self',
      ADD COLUMN IF NOT EXISTS "purchaser_user_id" uuid,
      ADD COLUMN IF NOT EXISTS "gift_recipients" jsonb,
      ADD COLUMN IF NOT EXISTS "email_delivery_status" varchar DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS "email_last_error" varchar,
      ADD COLUMN IF NOT EXISTS "email_attempts" numeric DEFAULT 0;

    ALTER TABLE "_orders_v"
      ADD COLUMN IF NOT EXISTS "version_purchase_mode" varchar DEFAULT 'self',
      ADD COLUMN IF NOT EXISTS "version_purchaser_user_id" uuid,
      ADD COLUMN IF NOT EXISTS "version_gift_recipients" jsonb,
      ADD COLUMN IF NOT EXISTS "version_email_delivery_status" varchar DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS "version_email_last_error" varchar,
      ADD COLUMN IF NOT EXISTS "version_email_attempts" numeric DEFAULT 0;

    CREATE INDEX IF NOT EXISTS "orders_purchaser_user_idx" ON "orders" USING btree ("purchaser_user_id");
    CREATE INDEX IF NOT EXISTS "orders_purchase_mode_idx" ON "orders" USING btree ("purchase_mode");

    -- Tickets: purchaser vs ticket holder separation, gifts, private invitations, people covered, email delivery
    ALTER TABLE "tickets"
      ADD COLUMN IF NOT EXISTS "acquisition_type" varchar DEFAULT 'self-purchase',
      ADD COLUMN IF NOT EXISTS "ticket_label" varchar,
      ADD COLUMN IF NOT EXISTS "purchaser_name" varchar,
      ADD COLUMN IF NOT EXISTS "purchaser_email" varchar,
      ADD COLUMN IF NOT EXISTS "purchaser_user_id" uuid,
      ADD COLUMN IF NOT EXISTS "gift_message" varchar,
      ADD COLUMN IF NOT EXISTS "people_covered" numeric DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "invitation_link_id" uuid,
      ADD COLUMN IF NOT EXISTS "email_delivery_status" varchar DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS "email_last_attempt_at" timestamptz,
      ADD COLUMN IF NOT EXISTS "email_last_error" varchar,
      ADD COLUMN IF NOT EXISTS "email_attempts" numeric DEFAULT 0;

    ALTER TABLE "_tickets_v"
      ADD COLUMN IF NOT EXISTS "version_acquisition_type" varchar DEFAULT 'self-purchase',
      ADD COLUMN IF NOT EXISTS "version_ticket_label" varchar,
      ADD COLUMN IF NOT EXISTS "version_purchaser_name" varchar,
      ADD COLUMN IF NOT EXISTS "version_purchaser_email" varchar,
      ADD COLUMN IF NOT EXISTS "version_purchaser_user_id" uuid,
      ADD COLUMN IF NOT EXISTS "version_gift_message" varchar,
      ADD COLUMN IF NOT EXISTS "version_people_covered" numeric DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "version_invitation_link_id" uuid,
      ADD COLUMN IF NOT EXISTS "version_email_delivery_status" varchar DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS "version_email_last_attempt_at" timestamptz,
      ADD COLUMN IF NOT EXISTS "version_email_last_error" varchar,
      ADD COLUMN IF NOT EXISTS "version_email_attempts" numeric DEFAULT 0;

    CREATE INDEX IF NOT EXISTS "tickets_purchaser_user_idx" ON "tickets" USING btree ("purchaser_user_id");
    CREATE INDEX IF NOT EXISTS "tickets_purchaser_email_idx" ON "tickets" USING btree (lower("purchaser_email"));
    CREATE INDEX IF NOT EXISTS "tickets_attendee_email_idx" ON "tickets" USING btree (lower("attendee_email"));
    CREATE INDEX IF NOT EXISTS "tickets_acquisition_type_idx" ON "tickets" USING btree ("acquisition_type");
    CREATE INDEX IF NOT EXISTS "tickets_invitation_link_idx" ON "tickets" USING btree ("invitation_link_id");

    -- Free Ticket Links: private individual & shareable invitations with claim limits & history
    ALTER TABLE "free_ticket_links"
      ADD COLUMN IF NOT EXISTS "invitation_type" varchar DEFAULT 'individual',
      ADD COLUMN IF NOT EXISTS "category_label" varchar DEFAULT 'Private Free Invitation',
      ADD COLUMN IF NOT EXISTS "max_claims" numeric DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "claimed_count" numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "personal_message" varchar,
      ADD COLUMN IF NOT EXISTS "claims" jsonb DEFAULT '[]'::jsonb;

    ALTER TABLE "_free_ticket_links_v"
      ADD COLUMN IF NOT EXISTS "version_invitation_type" varchar DEFAULT 'individual',
      ADD COLUMN IF NOT EXISTS "version_category_label" varchar DEFAULT 'Private Free Invitation',
      ADD COLUMN IF NOT EXISTS "version_max_claims" numeric DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "version_claimed_count" numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "version_personal_message" varchar,
      ADD COLUMN IF NOT EXISTS "version_claims" jsonb DEFAULT '[]'::jsonb;

    -- Team Memberships: event-scoped staff assignments
    ALTER TABLE "team_memberships"
      ADD COLUMN IF NOT EXISTS "assigned_events" jsonb DEFAULT '[]'::jsonb;

    ALTER TABLE "_team_memberships_v"
      ADD COLUMN IF NOT EXISTS "version_assigned_events" jsonb DEFAULT '[]'::jsonb;

    -- Backfill existing tickets acquisition_type & people_covered cleanly
    UPDATE "tickets"
    SET "acquisition_type" = CASE
      WHEN "source"::text = 'free-claim' THEN 'private-invitation'
      WHEN "source"::text = 'free-registration' THEN 'public-free'
      WHEN "source"::text IN ('complimentary', 'guest-list') THEN 'complimentary'
      ELSE 'self-purchase'
    END
    WHERE "acquisition_type" IS NULL OR "acquisition_type" = '';

    UPDATE "tickets"
    SET "people_covered" = 1
    WHERE "people_covered" IS NULL OR "people_covered" < 1;

    UPDATE "free_ticket_links"
    SET "max_claims" = 1
    WHERE "max_claims" IS NULL OR "max_claims" < 1;

    UPDATE "free_ticket_links"
    SET "claimed_count" = CASE WHEN "status"::text = 'claimed' THEN 1 ELSE 0 END
    WHERE "claimed_count" IS NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "team_memberships" DROP COLUMN IF EXISTS "assigned_events";
    ALTER TABLE "_team_memberships_v" DROP COLUMN IF EXISTS "version_assigned_events";

    ALTER TABLE "free_ticket_links"
      DROP COLUMN IF EXISTS "claims",
      DROP COLUMN IF EXISTS "personal_message",
      DROP COLUMN IF EXISTS "claimed_count",
      DROP COLUMN IF EXISTS "max_claims",
      DROP COLUMN IF EXISTS "category_label",
      DROP COLUMN IF EXISTS "invitation_type";
    ALTER TABLE "_free_ticket_links_v"
      DROP COLUMN IF EXISTS "version_claims",
      DROP COLUMN IF EXISTS "version_personal_message",
      DROP COLUMN IF EXISTS "version_claimed_count",
      DROP COLUMN IF EXISTS "version_max_claims",
      DROP COLUMN IF EXISTS "version_category_label",
      DROP COLUMN IF EXISTS "version_invitation_type";

    ALTER TABLE "tickets"
      DROP COLUMN IF EXISTS "email_attempts",
      DROP COLUMN IF EXISTS "email_last_error",
      DROP COLUMN IF EXISTS "email_last_attempt_at",
      DROP COLUMN IF EXISTS "email_delivery_status",
      DROP COLUMN IF EXISTS "invitation_link_id",
      DROP COLUMN IF EXISTS "people_covered",
      DROP COLUMN IF EXISTS "gift_message",
      DROP COLUMN IF EXISTS "purchaser_user_id",
      DROP COLUMN IF EXISTS "purchaser_email",
      DROP COLUMN IF EXISTS "purchaser_name",
      DROP COLUMN IF EXISTS "ticket_label",
      DROP COLUMN IF EXISTS "acquisition_type";
    ALTER TABLE "_tickets_v"
      DROP COLUMN IF EXISTS "version_email_attempts",
      DROP COLUMN IF EXISTS "version_email_last_error",
      DROP COLUMN IF EXISTS "version_email_last_attempt_at",
      DROP COLUMN IF EXISTS "version_email_delivery_status",
      DROP COLUMN IF EXISTS "version_invitation_link_id",
      DROP COLUMN IF EXISTS "version_people_covered",
      DROP COLUMN IF EXISTS "version_gift_message",
      DROP COLUMN IF EXISTS "version_purchaser_user_id",
      DROP COLUMN IF EXISTS "version_purchaser_email",
      DROP COLUMN IF EXISTS "version_purchaser_name",
      DROP COLUMN IF EXISTS "version_ticket_label",
      DROP COLUMN IF EXISTS "version_acquisition_type";

    ALTER TABLE "orders"
      DROP COLUMN IF EXISTS "email_attempts",
      DROP COLUMN IF EXISTS "email_last_error",
      DROP COLUMN IF EXISTS "email_delivery_status",
      DROP COLUMN IF EXISTS "gift_recipients",
      DROP COLUMN IF EXISTS "purchaser_user_id",
      DROP COLUMN IF EXISTS "purchase_mode";
    ALTER TABLE "_orders_v"
      DROP COLUMN IF EXISTS "version_email_attempts",
      DROP COLUMN IF EXISTS "version_email_last_error",
      DROP COLUMN IF EXISTS "version_email_delivery_status",
      DROP COLUMN IF EXISTS "version_gift_recipients",
      DROP COLUMN IF EXISTS "version_purchaser_user_id",
      DROP COLUMN IF EXISTS "version_purchase_mode";
  `)
}
