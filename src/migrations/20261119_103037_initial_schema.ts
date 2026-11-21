import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en');
  CREATE TYPE "public"."enum_users_role" AS ENUM('organizer', 'admin', 'super-admin');
  CREATE TYPE "public"."enum_users_account_status" AS ENUM('active', 'suspended');
  CREATE TYPE "public"."enum_users_account_type" AS ENUM('individual', 'organization');
  CREATE TYPE "public"."enum__users_v_version_role" AS ENUM('organizer', 'admin', 'super-admin');
  CREATE TYPE "public"."enum__users_v_version_account_status" AS ENUM('active', 'suspended');
  CREATE TYPE "public"."enum__users_v_version_account_type" AS ENUM('individual', 'organization');
  CREATE TYPE "public"."enum_events_attendee_questions_type" AS ENUM('text', 'multiple-choice', 'checkbox', 'date');
  CREATE TYPE "public"."enum_events_category" AS ENUM('Music', 'Festival', 'Conference', 'Lifestyle', 'Community', 'Food & Drink', 'Arts & Culture', 'Nightlife', 'Business', 'Wellness');
  CREATE TYPE "public"."enum_events_event_format" AS ENUM('physical', 'virtual', 'hybrid');
  CREATE TYPE "public"."enum_events_visibility" AS ENUM('public', 'private');
  CREATE TYPE "public"."enum_events_age_restriction" AS ENUM('all-ages', '13+', '16+', '18+', '21+');
  CREATE TYPE "public"."enum_events_check_in_status" AS ENUM('closed', 'open');
  CREATE TYPE "public"."enum_events_schedule_type" AS ENUM('single', 'recurring', 'multiple');
  CREATE TYPE "public"."enum_events_page_appearance" AS ENUM('light', 'dark', 'turquoise');
  CREATE TYPE "public"."enum_events_review_status" AS ENUM('draft', 'pending', 'approved', 'rejected', 'cancelled');
  CREATE TYPE "public"."enum_events_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__events_v_version_attendee_questions_type" AS ENUM('text', 'multiple-choice', 'checkbox', 'date');
  CREATE TYPE "public"."enum__events_v_version_category" AS ENUM('Music', 'Festival', 'Conference', 'Lifestyle', 'Community', 'Food & Drink', 'Arts & Culture', 'Nightlife', 'Business', 'Wellness');
  CREATE TYPE "public"."enum__events_v_version_event_format" AS ENUM('physical', 'virtual', 'hybrid');
  CREATE TYPE "public"."enum__events_v_version_visibility" AS ENUM('public', 'private');
  CREATE TYPE "public"."enum__events_v_version_age_restriction" AS ENUM('all-ages', '13+', '16+', '18+', '21+');
  CREATE TYPE "public"."enum__events_v_version_check_in_status" AS ENUM('closed', 'open');
  CREATE TYPE "public"."enum__events_v_version_schedule_type" AS ENUM('single', 'recurring', 'multiple');
  CREATE TYPE "public"."enum__events_v_version_page_appearance" AS ENUM('light', 'dark', 'turquoise');
  CREATE TYPE "public"."enum__events_v_version_review_status" AS ENUM('draft', 'pending', 'approved', 'rejected', 'cancelled');
  CREATE TYPE "public"."enum__events_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__events_v_published_locale" AS ENUM('en');
  CREATE TYPE "public"."enum_ticket_types_ticket_kind" AS ENUM('paid', 'free');
  CREATE TYPE "public"."enum_ticket_types_preset" AS ENUM('early-bird', 'general', 'vip', 'table', 'custom');
  CREATE TYPE "public"."enum_ticket_types_ticket_mode" AS ENUM('single', 'group');
  CREATE TYPE "public"."enum_ticket_types_visibility" AS ENUM('public', 'invite-only');
  CREATE TYPE "public"."enum_ticket_types_sales_status" AS ENUM('active', 'paused', 'sold-out');
  CREATE TYPE "public"."enum__ticket_types_v_version_ticket_kind" AS ENUM('paid', 'free');
  CREATE TYPE "public"."enum__ticket_types_v_version_preset" AS ENUM('early-bird', 'general', 'vip', 'table', 'custom');
  CREATE TYPE "public"."enum__ticket_types_v_version_ticket_mode" AS ENUM('single', 'group');
  CREATE TYPE "public"."enum__ticket_types_v_version_visibility" AS ENUM('public', 'invite-only');
  CREATE TYPE "public"."enum__ticket_types_v_version_sales_status" AS ENUM('active', 'paused', 'sold-out');
  CREATE TYPE "public"."enum_discounts_kind" AS ENUM('percentage', 'fixed');
  CREATE TYPE "public"."enum__discounts_v_version_kind" AS ENUM('percentage', 'fixed');
  CREATE TYPE "public"."enum_guest_list_entries_status" AS ENUM('invited', 'issued', 'checked-in', 'cancelled');
  CREATE TYPE "public"."enum__guest_list_entries_v_version_status" AS ENUM('invited', 'issued', 'checked-in', 'cancelled');
  CREATE TYPE "public"."enum_announcements_audience" AS ENUM('all-attendees', 'checked-in', 'not-checked-in');
  CREATE TYPE "public"."enum_announcements_delivery_status" AS ENUM('disabled', 'queued', 'sent');
  CREATE TYPE "public"."enum__announcements_v_version_audience" AS ENUM('all-attendees', 'checked-in', 'not-checked-in');
  CREATE TYPE "public"."enum__announcements_v_version_delivery_status" AS ENUM('disabled', 'queued', 'sent');
  CREATE TYPE "public"."enum_bank_verifications_status" AS ENUM('pending', 'verified', 'rejected');
  CREATE TYPE "public"."enum__bank_verifications_v_version_status" AS ENUM('pending', 'verified', 'rejected');
  CREATE TYPE "public"."enum_bank_change_appeals_status" AS ENUM('pending', 'approved', 'rejected');
  CREATE TYPE "public"."enum__bank_change_appeals_v_version_status" AS ENUM('pending', 'approved', 'rejected');
  CREATE TYPE "public"."enum_free_ticket_links_status" AS ENUM('active', 'claimed', 'expired', 'revoked');
  CREATE TYPE "public"."enum__free_ticket_links_v_version_status" AS ENUM('active', 'claimed', 'expired', 'revoked');
  CREATE TYPE "public"."enum_orders_order_kind" AS ENUM('paid', 'free', 'complimentary');
  CREATE TYPE "public"."enum_orders_status" AS ENUM('pending', 'paid', 'failed', 'refunded', 'cancelled');
  CREATE TYPE "public"."enum__orders_v_version_order_kind" AS ENUM('paid', 'free', 'complimentary');
  CREATE TYPE "public"."enum__orders_v_version_status" AS ENUM('pending', 'paid', 'failed', 'refunded', 'cancelled');
  CREATE TYPE "public"."enum_transactions_provider" AS ENUM('paystack');
  CREATE TYPE "public"."enum_transactions_status" AS ENUM('initialized', 'success', 'failed', 'refunded');
  CREATE TYPE "public"."enum__transactions_v_version_provider" AS ENUM('paystack');
  CREATE TYPE "public"."enum__transactions_v_version_status" AS ENUM('initialized', 'success', 'failed', 'refunded');
  CREATE TYPE "public"."enum_tickets_source" AS ENUM('purchase', 'free-registration', 'free-claim', 'complimentary', 'guest-list');
  CREATE TYPE "public"."enum_tickets_status" AS ENUM('valid', 'used', 'refunded', 'void');
  CREATE TYPE "public"."enum__tickets_v_version_source" AS ENUM('purchase', 'free-registration', 'free-claim', 'complimentary', 'guest-list');
  CREATE TYPE "public"."enum__tickets_v_version_status" AS ENUM('valid', 'used', 'refunded', 'void');
  CREATE TYPE "public"."enum_team_memberships_permissions" AS ENUM('events', 'attendees', 'check-in', 'reports', 'finance');
  CREATE TYPE "public"."enum_team_memberships_role" AS ENUM('manager', 'check-in', 'analyst', 'finance');
  CREATE TYPE "public"."enum_team_memberships_invitation_status" AS ENUM('pending', 'accepted', 'revoked');
  CREATE TYPE "public"."enum__team_memberships_v_version_permissions" AS ENUM('events', 'attendees', 'check-in', 'reports', 'finance');
  CREATE TYPE "public"."enum__team_memberships_v_version_role" AS ENUM('manager', 'check-in', 'analyst', 'finance');
  CREATE TYPE "public"."enum__team_memberships_v_version_invitation_status" AS ENUM('pending', 'accepted', 'revoked');
  CREATE TYPE "public"."enum_payout_requests_status" AS ENUM('pending', 'processing', 'approved', 'paid', 'failed', 'rejected');
  CREATE TYPE "public"."enum__payout_requests_v_version_status" AS ENUM('pending', 'processing', 'approved', 'paid', 'failed', 'rejected');
  CREATE TYPE "public"."enum_refunds_status" AS ENUM('pending', 'processed', 'failed');
  CREATE TYPE "public"."enum__refunds_v_version_status" AS ENUM('pending', 'processed', 'failed');
  CREATE TYPE "public"."enum_complaints_status" AS ENUM('open', 'investigating', 'resolved', 'closed');
  CREATE TYPE "public"."enum__complaints_v_version_status" AS ENUM('open', 'investigating', 'resolved', 'closed');
  CREATE TYPE "public"."enum_subscribers_status" AS ENUM('subscribed', 'unsubscribed');
  CREATE TYPE "public"."enum__subscribers_v_version_status" AS ENUM('subscribed', 'unsubscribed');
  CREATE TYPE "public"."enum_audit_logs_category" AS ENUM('auth', 'event', 'ticket', 'bank', 'appeal', 'user', 'payout', 'refund', 'admin', 'settings');
  CREATE TYPE "public"."enum__audit_logs_v_version_category" AS ENUM('auth', 'event', 'ticket', 'bank', 'appeal', 'user', 'payout', 'refund', 'admin', 'settings');
  CREATE TYPE "public"."enum_payload_llm_instructions_entity_type" AS ENUM('collection', 'global');
  CREATE TABLE "admins_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"refresh_count" numeric,
  	"refreshed_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "admins" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "admins_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "media" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"alt" varchar NOT NULL,
  	"_h_folders_id" uuid,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"_stored" boolean,
  	"_transforms" jsonb,
  	"original_filename" varchar,
  	"original_url" varchar,
  	"original_mime_type" varchar,
  	"original_filesize" numeric,
  	"original_width" numeric,
  	"original_height" numeric,
  	"original_prefix" varchar,
  	"original__objectkey" varchar,
  	"original__stored" boolean,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "media_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" uuid,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_media_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_alt" varchar NOT NULL,
  	"version__h_folders_id" uuid,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_url" varchar,
  	"version_thumbnail_u_r_l" varchar,
  	"version_filename" varchar,
  	"version_mime_type" varchar,
  	"version_filesize" numeric,
  	"version_width" numeric,
  	"version_height" numeric,
  	"version__stored" boolean,
  	"version__transforms" jsonb,
  	"version_original_filename" varchar,
  	"version_original_url" varchar,
  	"version_original_mime_type" varchar,
  	"version_original_filesize" numeric,
  	"version_original_width" numeric,
  	"version_original_height" numeric,
  	"version_original_prefix" varchar,
  	"version_original__objectkey" varchar,
  	"version_original__stored" boolean,
  	"version_focal_x" numeric,
  	"version_focal_y" numeric,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_media_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" uuid,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "folders" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"_h_folders_id" uuid,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "folders_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_folders_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version__h_folders_id" uuid,
  	"version_name" varchar NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_folders_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "tags" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"_h_tags_id" uuid,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tags_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_tags_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version__h_tags_id" uuid,
  	"version_name" varchar NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_tags_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"refresh_count" numeric,
  	"refreshed_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "users" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"first_name" varchar,
  	"last_name" varchar,
  	"role" "enum_users_role" DEFAULT 'organizer' NOT NULL,
  	"account_status" "enum_users_account_status" DEFAULT 'active' NOT NULL,
  	"must_change_password" boolean DEFAULT false,
  	"token_version" numeric DEFAULT 0,
  	"phone" varchar,
  	"business_name" varchar,
  	"account_type" "enum_users_account_type" DEFAULT 'individual',
  	"country" varchar,
  	"state" varchar,
  	"city" varchar,
  	"business_address" varchar,
  	"cac_number" varchar,
  	"website" varchar,
  	"onboarding_complete" boolean DEFAULT false,
  	"bio" varchar,
  	"bank_bank_code" varchar,
  	"bank_account_number" varchar,
  	"bank_account_name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"_verified" boolean,
  	"_verificationtoken" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "users_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_users_v_version_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"_uuid" varchar NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"refresh_count" numeric,
  	"refreshed_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_users_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_name" varchar NOT NULL,
  	"version_first_name" varchar,
  	"version_last_name" varchar,
  	"version_role" "enum__users_v_version_role" DEFAULT 'organizer' NOT NULL,
  	"version_account_status" "enum__users_v_version_account_status" DEFAULT 'active' NOT NULL,
  	"version_must_change_password" boolean DEFAULT false,
  	"version_token_version" numeric DEFAULT 0,
  	"version_phone" varchar,
  	"version_business_name" varchar,
  	"version_account_type" "enum__users_v_version_account_type" DEFAULT 'individual',
  	"version_country" varchar,
  	"version_state" varchar,
  	"version_city" varchar,
  	"version_business_address" varchar,
  	"version_cac_number" varchar,
  	"version_website" varchar,
  	"version_onboarding_complete" boolean DEFAULT false,
  	"version_bio" varchar,
  	"version_bank_bank_code" varchar,
  	"version_bank_account_number" varchar,
  	"version_bank_account_name" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_email" varchar NOT NULL,
  	"version_reset_password_token" varchar,
  	"version_reset_password_expiration" timestamp(3) with time zone,
  	"version_salt" varchar,
  	"version_hash" varchar,
  	"version_reset_password_requested_at" timestamp(3) with time zone,
  	"version__verified" boolean,
  	"version__verificationtoken" varchar,
  	"version_login_attempts" numeric DEFAULT 0,
  	"version_lock_until" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_users_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "events_previous_slugs" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"slug" varchar
  );
  
  CREATE TABLE "events_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "events_attendee_questions_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "events_attendee_questions" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"type" "enum_events_attendee_questions_type",
  	"required" boolean DEFAULT false
  );
  
  CREATE TABLE "events" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"organizer_id" uuid,
  	"title" varchar,
  	"slug" varchar,
  	"client_request_id" varchar,
  	"category" "enum_events_category",
  	"hero_image_id" uuid,
  	"short_description" varchar,
  	"description" varchar,
  	"event_format" "enum_events_event_format" DEFAULT 'physical',
  	"visibility" "enum_events_visibility" DEFAULT 'public',
  	"age_restriction" "enum_events_age_restriction" DEFAULT 'all-ages',
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"venue" varchar,
  	"address" varchar,
  	"country" varchar DEFAULT 'Nigeria',
  	"state" varchar DEFAULT 'FCT',
  	"virtual_link" varchar,
  	"city" varchar DEFAULT 'Abuja',
  	"capacity" numeric,
  	"sales_open_at" timestamp(3) with time zone,
  	"sales_close_at" timestamp(3) with time zone,
  	"check_in_status" "enum_events_check_in_status" DEFAULT 'closed',
  	"schedule_type" "enum_events_schedule_type" DEFAULT 'single',
  	"video_u_r_l" varchar,
  	"page_appearance" "enum_events_page_appearance" DEFAULT 'light',
  	"contact_name" varchar,
  	"contact_email" varchar,
  	"contact_phone" varchar,
  	"terms" varchar,
  	"entry_requirements" varchar,
  	"refund_policy" varchar,
  	"review_status" "enum_events_review_status" DEFAULT 'draft',
  	"review_note" varchar,
  	"submitted_at" timestamp(3) with time zone,
  	"reviewed_at" timestamp(3) with time zone,
  	"reviewed_by_id" uuid,
  	"wizard_step" numeric DEFAULT 1,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_events_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "events_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" uuid,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_events_v_version_previous_slugs" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"slug" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_events_v_version_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_events_v_version_attendee_questions_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_events_v_version_attendee_questions" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar,
  	"type" "enum__events_v_version_attendee_questions_type",
  	"required" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_events_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_organizer_id" uuid,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_client_request_id" varchar,
  	"version_category" "enum__events_v_version_category",
  	"version_hero_image_id" uuid,
  	"version_short_description" varchar,
  	"version_description" varchar,
  	"version_event_format" "enum__events_v_version_event_format" DEFAULT 'physical',
  	"version_visibility" "enum__events_v_version_visibility" DEFAULT 'public',
  	"version_age_restriction" "enum__events_v_version_age_restriction" DEFAULT 'all-ages',
  	"version_starts_at" timestamp(3) with time zone,
  	"version_ends_at" timestamp(3) with time zone,
  	"version_venue" varchar,
  	"version_address" varchar,
  	"version_country" varchar DEFAULT 'Nigeria',
  	"version_state" varchar DEFAULT 'FCT',
  	"version_virtual_link" varchar,
  	"version_city" varchar DEFAULT 'Abuja',
  	"version_capacity" numeric,
  	"version_sales_open_at" timestamp(3) with time zone,
  	"version_sales_close_at" timestamp(3) with time zone,
  	"version_check_in_status" "enum__events_v_version_check_in_status" DEFAULT 'closed',
  	"version_schedule_type" "enum__events_v_version_schedule_type" DEFAULT 'single',
  	"version_video_u_r_l" varchar,
  	"version_page_appearance" "enum__events_v_version_page_appearance" DEFAULT 'light',
  	"version_contact_name" varchar,
  	"version_contact_email" varchar,
  	"version_contact_phone" varchar,
  	"version_terms" varchar,
  	"version_entry_requirements" varchar,
  	"version_refund_policy" varchar,
  	"version_review_status" "enum__events_v_version_review_status" DEFAULT 'draft',
  	"version_review_note" varchar,
  	"version_submitted_at" timestamp(3) with time zone,
  	"version_reviewed_at" timestamp(3) with time zone,
  	"version_reviewed_by_id" uuid,
  	"version_wizard_step" numeric DEFAULT 1,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__events_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"published_locale" "enum__events_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_events_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" uuid,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "ticket_types_perks" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"perk" varchar NOT NULL
  );
  
  CREATE TABLE "ticket_types" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"event_id" uuid NOT NULL,
  	"name" varchar NOT NULL,
  	"ticket_kind" "enum_ticket_types_ticket_kind" DEFAULT 'paid',
  	"description" varchar,
  	"price" numeric NOT NULL,
  	"quantity" numeric NOT NULL,
  	"max_per_order" numeric DEFAULT 8 NOT NULL,
  	"min_per_order" numeric DEFAULT 1,
  	"preset" "enum_ticket_types_preset" DEFAULT 'general',
  	"sales_open_at" timestamp(3) with time zone,
  	"sales_close_at" timestamp(3) with time zone,
  	"ticket_mode" "enum_ticket_types_ticket_mode" DEFAULT 'single',
  	"group_size" numeric,
  	"visibility" "enum_ticket_types_visibility" DEFAULT 'public',
  	"sales_status" "enum_ticket_types_sales_status" DEFAULT 'active',
  	"active" boolean DEFAULT true NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ticket_types_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_ticket_types_v_version_perks" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"perk" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_ticket_types_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_event_id" uuid NOT NULL,
  	"version_name" varchar NOT NULL,
  	"version_ticket_kind" "enum__ticket_types_v_version_ticket_kind" DEFAULT 'paid',
  	"version_description" varchar,
  	"version_price" numeric NOT NULL,
  	"version_quantity" numeric NOT NULL,
  	"version_max_per_order" numeric DEFAULT 8 NOT NULL,
  	"version_min_per_order" numeric DEFAULT 1,
  	"version_preset" "enum__ticket_types_v_version_preset" DEFAULT 'general',
  	"version_sales_open_at" timestamp(3) with time zone,
  	"version_sales_close_at" timestamp(3) with time zone,
  	"version_ticket_mode" "enum__ticket_types_v_version_ticket_mode" DEFAULT 'single',
  	"version_group_size" numeric,
  	"version_visibility" "enum__ticket_types_v_version_visibility" DEFAULT 'public',
  	"version_sales_status" "enum__ticket_types_v_version_sales_status" DEFAULT 'active',
  	"version_active" boolean DEFAULT true NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_ticket_types_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "organizer_profiles" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"owner_id" uuid NOT NULL,
  	"display_name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"logo_id" uuid,
  	"about" varchar,
  	"contact_email" varchar,
  	"contact_phone" varchar,
  	"social_instagram" varchar,
  	"social_facebook" varchar,
  	"social_tiktok" varchar,
  	"social_website" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "organizer_profiles_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_organizer_profiles_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_owner_id" uuid NOT NULL,
  	"version_display_name" varchar NOT NULL,
  	"version_slug" varchar NOT NULL,
  	"version_logo_id" uuid,
  	"version_about" varchar,
  	"version_contact_email" varchar,
  	"version_contact_phone" varchar,
  	"version_social_instagram" varchar,
  	"version_social_facebook" varchar,
  	"version_social_tiktok" varchar,
  	"version_social_website" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_organizer_profiles_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "discounts" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"organizer_id" uuid NOT NULL,
  	"event_id" uuid NOT NULL,
  	"code" varchar NOT NULL,
  	"kind" "enum_discounts_kind" NOT NULL,
  	"value" numeric NOT NULL,
  	"usage_limit" numeric,
  	"used_count" numeric DEFAULT 0,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "discounts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_discounts_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_organizer_id" uuid NOT NULL,
  	"version_event_id" uuid NOT NULL,
  	"version_code" varchar NOT NULL,
  	"version_kind" "enum__discounts_v_version_kind" NOT NULL,
  	"version_value" numeric NOT NULL,
  	"version_usage_limit" numeric,
  	"version_used_count" numeric DEFAULT 0,
  	"version_starts_at" timestamp(3) with time zone,
  	"version_ends_at" timestamp(3) with time zone,
  	"version_active" boolean DEFAULT true,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_discounts_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "guest_list_entries" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"organizer_id" uuid NOT NULL,
  	"event_id" uuid NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"quantity" numeric DEFAULT 1 NOT NULL,
  	"notes" varchar,
  	"status" "enum_guest_list_entries_status" DEFAULT 'invited',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "guest_list_entries_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_guest_list_entries_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_organizer_id" uuid NOT NULL,
  	"version_event_id" uuid NOT NULL,
  	"version_name" varchar NOT NULL,
  	"version_email" varchar NOT NULL,
  	"version_phone" varchar,
  	"version_quantity" numeric DEFAULT 1 NOT NULL,
  	"version_notes" varchar,
  	"version_status" "enum__guest_list_entries_v_version_status" DEFAULT 'invited',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_guest_list_entries_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "announcements" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"organizer_id" uuid NOT NULL,
  	"event_id" uuid NOT NULL,
  	"subject" varchar NOT NULL,
  	"message" varchar NOT NULL,
  	"audience" "enum_announcements_audience" DEFAULT 'all-attendees',
  	"delivery_status" "enum_announcements_delivery_status" DEFAULT 'disabled',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "announcements_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_announcements_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_organizer_id" uuid NOT NULL,
  	"version_event_id" uuid NOT NULL,
  	"version_subject" varchar NOT NULL,
  	"version_message" varchar NOT NULL,
  	"version_audience" "enum__announcements_v_version_audience" DEFAULT 'all-attendees',
  	"version_delivery_status" "enum__announcements_v_version_delivery_status" DEFAULT 'disabled',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_announcements_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "event_collections" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"organizer_id" uuid NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "event_collections_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"events_id" uuid,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_event_collections_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_organizer_id" uuid NOT NULL,
  	"version_name" varchar NOT NULL,
  	"version_description" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_event_collections_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"events_id" uuid,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "bank_verifications" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"organizer_id" uuid NOT NULL,
  	"bank_code" varchar NOT NULL,
  	"bank_name" varchar NOT NULL,
  	"account_number" varchar NOT NULL,
  	"account_name" varchar NOT NULL,
  	"locked" boolean DEFAULT false,
  	"verification_provider" varchar DEFAULT 'paystack',
  	"status" "enum_bank_verifications_status" DEFAULT 'pending',
  	"verified_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "bank_verifications_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_bank_verifications_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_organizer_id" uuid NOT NULL,
  	"version_bank_code" varchar NOT NULL,
  	"version_bank_name" varchar NOT NULL,
  	"version_account_number" varchar NOT NULL,
  	"version_account_name" varchar NOT NULL,
  	"version_locked" boolean DEFAULT false,
  	"version_verification_provider" varchar DEFAULT 'paystack',
  	"version_status" "enum__bank_verifications_v_version_status" DEFAULT 'pending',
  	"version_verified_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_bank_verifications_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "bank_change_appeals_audit_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"action" varchar NOT NULL,
  	"actor_email" varchar NOT NULL,
  	"actor_role" varchar NOT NULL,
  	"note" varchar,
  	"at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "bank_change_appeals" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"organizer_id" uuid NOT NULL,
  	"current_bank_name" varchar NOT NULL,
  	"current_bank_code" varchar NOT NULL,
  	"current_account_number" varchar NOT NULL,
  	"current_account_name" varchar NOT NULL,
  	"proposed_bank_name" varchar NOT NULL,
  	"proposed_bank_code" varchar NOT NULL,
  	"proposed_account_number" varchar NOT NULL,
  	"proposed_account_name" varchar NOT NULL,
  	"verification_provider" varchar DEFAULT 'paystack',
  	"reason" varchar NOT NULL,
  	"status" "enum_bank_change_appeals_status" DEFAULT 'pending' NOT NULL,
  	"submitted_at" timestamp(3) with time zone NOT NULL,
  	"review_eligible_at" timestamp(3) with time zone NOT NULL,
  	"reviewed_by_id" uuid,
  	"reviewed_by_role" varchar,
  	"reviewed_at" timestamp(3) with time zone,
  	"review_note" varchar,
  	"overridden_by_id" uuid,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "bank_change_appeals_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_bank_change_appeals_v_version_audit_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"action" varchar NOT NULL,
  	"actor_email" varchar NOT NULL,
  	"actor_role" varchar NOT NULL,
  	"note" varchar,
  	"at" timestamp(3) with time zone NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_bank_change_appeals_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_organizer_id" uuid NOT NULL,
  	"version_current_bank_name" varchar NOT NULL,
  	"version_current_bank_code" varchar NOT NULL,
  	"version_current_account_number" varchar NOT NULL,
  	"version_current_account_name" varchar NOT NULL,
  	"version_proposed_bank_name" varchar NOT NULL,
  	"version_proposed_bank_code" varchar NOT NULL,
  	"version_proposed_account_number" varchar NOT NULL,
  	"version_proposed_account_name" varchar NOT NULL,
  	"version_verification_provider" varchar DEFAULT 'paystack',
  	"version_reason" varchar NOT NULL,
  	"version_status" "enum__bank_change_appeals_v_version_status" DEFAULT 'pending' NOT NULL,
  	"version_submitted_at" timestamp(3) with time zone NOT NULL,
  	"version_review_eligible_at" timestamp(3) with time zone NOT NULL,
  	"version_reviewed_by_id" uuid,
  	"version_reviewed_by_role" varchar,
  	"version_reviewed_at" timestamp(3) with time zone,
  	"version_review_note" varchar,
  	"version_overridden_by_id" uuid,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_bank_change_appeals_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "free_ticket_links" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"code" varchar NOT NULL,
  	"event_id" uuid NOT NULL,
  	"ticket_type_id" uuid NOT NULL,
  	"organizer_id" uuid NOT NULL,
  	"recipient_name" varchar,
  	"recipient_email" varchar,
  	"status" "enum_free_ticket_links_status" DEFAULT 'active' NOT NULL,
  	"expires_at" timestamp(3) with time zone,
  	"claimed_at" timestamp(3) with time zone,
  	"claimed_by_name" varchar,
  	"claimed_by_email" varchar,
  	"ticket_id" uuid,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "free_ticket_links_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_free_ticket_links_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_code" varchar NOT NULL,
  	"version_event_id" uuid NOT NULL,
  	"version_ticket_type_id" uuid NOT NULL,
  	"version_organizer_id" uuid NOT NULL,
  	"version_recipient_name" varchar,
  	"version_recipient_email" varchar,
  	"version_status" "enum__free_ticket_links_v_version_status" DEFAULT 'active' NOT NULL,
  	"version_expires_at" timestamp(3) with time zone,
  	"version_claimed_at" timestamp(3) with time zone,
  	"version_claimed_by_name" varchar,
  	"version_claimed_by_email" varchar,
  	"version_ticket_id" uuid,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_free_ticket_links_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "orders_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ticket_type_id" uuid NOT NULL,
  	"name" varchar NOT NULL,
  	"quantity" numeric NOT NULL,
  	"unit_price" numeric NOT NULL
  );
  
  CREATE TABLE "orders_attendee_answers" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL
  );
  
  CREATE TABLE "orders" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"reference" varchar NOT NULL,
  	"event_id" uuid NOT NULL,
  	"customer_first_name" varchar NOT NULL,
  	"customer_last_name" varchar NOT NULL,
  	"customer_email" varchar NOT NULL,
  	"customer_phone" varchar NOT NULL,
  	"subtotal" numeric NOT NULL,
  	"fees" numeric NOT NULL,
  	"service_fee_percent" numeric,
  	"service_fee_amount" numeric,
  	"commission_percent" numeric,
  	"commission_amount" numeric,
  	"organizer_earnings" numeric,
  	"discount_code" varchar,
  	"discount_amount" numeric,
  	"total" numeric NOT NULL,
  	"order_kind" "enum_orders_order_kind" DEFAULT 'paid',
  	"status" "enum_orders_status" DEFAULT 'pending' NOT NULL,
  	"paid_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "orders_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_orders_v_version_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"ticket_type_id" uuid NOT NULL,
  	"name" varchar NOT NULL,
  	"quantity" numeric NOT NULL,
  	"unit_price" numeric NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_orders_v_version_attendee_answers" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_orders_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_reference" varchar NOT NULL,
  	"version_event_id" uuid NOT NULL,
  	"version_customer_first_name" varchar NOT NULL,
  	"version_customer_last_name" varchar NOT NULL,
  	"version_customer_email" varchar NOT NULL,
  	"version_customer_phone" varchar NOT NULL,
  	"version_subtotal" numeric NOT NULL,
  	"version_fees" numeric NOT NULL,
  	"version_service_fee_percent" numeric,
  	"version_service_fee_amount" numeric,
  	"version_commission_percent" numeric,
  	"version_commission_amount" numeric,
  	"version_organizer_earnings" numeric,
  	"version_discount_code" varchar,
  	"version_discount_amount" numeric,
  	"version_total" numeric NOT NULL,
  	"version_order_kind" "enum__orders_v_version_order_kind" DEFAULT 'paid',
  	"version_status" "enum__orders_v_version_status" DEFAULT 'pending' NOT NULL,
  	"version_paid_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_orders_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "transactions" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"order_id" uuid NOT NULL,
  	"event_id" uuid NOT NULL,
  	"provider" "enum_transactions_provider" DEFAULT 'paystack' NOT NULL,
  	"provider_reference" varchar NOT NULL,
  	"amount" numeric NOT NULL,
  	"currency" varchar DEFAULT 'NGN' NOT NULL,
  	"status" "enum_transactions_status" NOT NULL,
  	"verified_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "transactions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_transactions_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_order_id" uuid NOT NULL,
  	"version_event_id" uuid NOT NULL,
  	"version_provider" "enum__transactions_v_version_provider" DEFAULT 'paystack' NOT NULL,
  	"version_provider_reference" varchar NOT NULL,
  	"version_amount" numeric NOT NULL,
  	"version_currency" varchar DEFAULT 'NGN' NOT NULL,
  	"version_status" "enum__transactions_v_version_status" NOT NULL,
  	"version_verified_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_transactions_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "tickets" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"code" varchar NOT NULL,
  	"issuance_key" varchar,
  	"order_id" uuid NOT NULL,
  	"event_id" uuid NOT NULL,
  	"ticket_type_id" uuid NOT NULL,
  	"attendee_name" varchar NOT NULL,
  	"attendee_email" varchar NOT NULL,
  	"attendee_phone" varchar,
  	"source" "enum_tickets_source" DEFAULT 'purchase',
  	"status" "enum_tickets_status" DEFAULT 'valid' NOT NULL,
  	"checked_in_at" timestamp(3) with time zone,
  	"checked_in_by_id" uuid,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tickets_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_tickets_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_code" varchar NOT NULL,
  	"version_issuance_key" varchar,
  	"version_order_id" uuid NOT NULL,
  	"version_event_id" uuid NOT NULL,
  	"version_ticket_type_id" uuid NOT NULL,
  	"version_attendee_name" varchar NOT NULL,
  	"version_attendee_email" varchar NOT NULL,
  	"version_attendee_phone" varchar,
  	"version_source" "enum__tickets_v_version_source" DEFAULT 'purchase',
  	"version_status" "enum__tickets_v_version_status" DEFAULT 'valid' NOT NULL,
  	"version_checked_in_at" timestamp(3) with time zone,
  	"version_checked_in_by_id" uuid,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_tickets_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "team_memberships_permissions" (
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"value" "enum_team_memberships_permissions",
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
  );
  
  CREATE TABLE "team_memberships" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"organizer_id" uuid NOT NULL,
  	"email" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_team_memberships_role" NOT NULL,
  	"invitation_status" "enum_team_memberships_invitation_status" DEFAULT 'pending',
  	"active" boolean DEFAULT true NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "team_memberships_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_team_memberships_v_version_permissions" (
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"value" "enum__team_memberships_v_version_permissions",
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
  );
  
  CREATE TABLE "_team_memberships_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_organizer_id" uuid NOT NULL,
  	"version_email" varchar NOT NULL,
  	"version_name" varchar NOT NULL,
  	"version_role" "enum__team_memberships_v_version_role" NOT NULL,
  	"version_invitation_status" "enum__team_memberships_v_version_invitation_status" DEFAULT 'pending',
  	"version_active" boolean DEFAULT true NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_team_memberships_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "payout_requests" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"reference" varchar NOT NULL,
  	"idempotency_key" varchar,
  	"organizer_id" uuid NOT NULL,
  	"event_id" uuid NOT NULL,
  	"amount" numeric NOT NULL,
  	"status" "enum_payout_requests_status" DEFAULT 'pending' NOT NULL,
  	"initiated_by_id" uuid,
  	"initiated_by_role" varchar,
  	"reviewed_by_id" uuid,
  	"review_note" varchar,
  	"reason" varchar,
  	"bank_name" varchar,
  	"bank_code" varchar,
  	"account_number" varchar,
  	"account_name" varchar,
  	"paystack_recipient_code" varchar,
  	"paystack_transfer_code" varchar,
  	"paystack_transfer_reference" varchar,
  	"failure_reason" varchar,
  	"provider_payload" jsonb,
  	"paid_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payout_requests_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_payout_requests_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_reference" varchar NOT NULL,
  	"version_idempotency_key" varchar,
  	"version_organizer_id" uuid NOT NULL,
  	"version_event_id" uuid NOT NULL,
  	"version_amount" numeric NOT NULL,
  	"version_status" "enum__payout_requests_v_version_status" DEFAULT 'pending' NOT NULL,
  	"version_initiated_by_id" uuid,
  	"version_initiated_by_role" varchar,
  	"version_reviewed_by_id" uuid,
  	"version_review_note" varchar,
  	"version_reason" varchar,
  	"version_bank_name" varchar,
  	"version_bank_code" varchar,
  	"version_account_number" varchar,
  	"version_account_name" varchar,
  	"version_paystack_recipient_code" varchar,
  	"version_paystack_transfer_code" varchar,
  	"version_paystack_transfer_reference" varchar,
  	"version_failure_reason" varchar,
  	"version_provider_payload" jsonb,
  	"version_paid_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_payout_requests_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "refunds" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"reference" varchar NOT NULL,
  	"order_id" uuid NOT NULL,
  	"event_id" uuid NOT NULL,
  	"amount" numeric NOT NULL,
  	"reason" varchar NOT NULL,
  	"status" "enum_refunds_status" DEFAULT 'pending' NOT NULL,
  	"initiated_by_id" uuid,
  	"paystack_refund_id" varchar,
  	"paystack_status" varchar,
  	"failure_reason" varchar,
  	"processed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "refunds_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_refunds_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_reference" varchar NOT NULL,
  	"version_order_id" uuid NOT NULL,
  	"version_event_id" uuid NOT NULL,
  	"version_amount" numeric NOT NULL,
  	"version_reason" varchar NOT NULL,
  	"version_status" "enum__refunds_v_version_status" DEFAULT 'pending' NOT NULL,
  	"version_initiated_by_id" uuid,
  	"version_paystack_refund_id" varchar,
  	"version_paystack_status" varchar,
  	"version_failure_reason" varchar,
  	"version_processed_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_refunds_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "complaints" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"subject" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"message" varchar NOT NULL,
  	"order_reference" varchar,
  	"status" "enum_complaints_status" DEFAULT 'open' NOT NULL,
  	"internal_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "complaints_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_complaints_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_subject" varchar NOT NULL,
  	"version_name" varchar NOT NULL,
  	"version_email" varchar NOT NULL,
  	"version_message" varchar NOT NULL,
  	"version_order_reference" varchar,
  	"version_status" "enum__complaints_v_version_status" DEFAULT 'open' NOT NULL,
  	"version_internal_notes" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_complaints_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "subscribers" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"email" varchar NOT NULL,
  	"status" "enum_subscribers_status" DEFAULT 'subscribed' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "subscribers_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_subscribers_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_email" varchar NOT NULL,
  	"version_status" "enum__subscribers_v_version_status" DEFAULT 'subscribed' NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_subscribers_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "audit_logs" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"action" varchar NOT NULL,
  	"category" "enum_audit_logs_category" NOT NULL,
  	"actor_id" uuid,
  	"actor_email" varchar,
  	"actor_role" varchar,
  	"target_collection" varchar,
  	"target_id" varchar,
  	"summary" varchar NOT NULL,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "audit_logs_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_audit_logs_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_action" varchar NOT NULL,
  	"version_category" "enum__audit_logs_v_version_category" NOT NULL,
  	"version_actor_id" uuid,
  	"version_actor_email" varchar,
  	"version_actor_role" varchar,
  	"version_target_collection" varchar,
  	"version_target_id" varchar,
  	"version_summary" varchar NOT NULL,
  	"version_metadata" jsonb,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_audit_logs_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "payload_kv" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"media_id" uuid,
  	"folders_id" uuid,
  	"tags_id" uuid,
  	"users_id" uuid,
  	"events_id" uuid,
  	"ticket_types_id" uuid,
  	"organizer_profiles_id" uuid,
  	"discounts_id" uuid,
  	"guest_list_entries_id" uuid,
  	"announcements_id" uuid,
  	"event_collections_id" uuid,
  	"bank_verifications_id" uuid,
  	"bank_change_appeals_id" uuid,
  	"free_ticket_links_id" uuid,
  	"orders_id" uuid,
  	"transactions_id" uuid,
  	"tickets_id" uuid,
  	"team_memberships_id" uuid,
  	"payout_requests_id" uuid,
  	"refunds_id" uuid,
  	"complaints_id" uuid,
  	"subscribers_id" uuid,
  	"audit_logs_id" uuid
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_llm_instructions" (
  	"id" varchar PRIMARY KEY NOT NULL,
  	"entity_slug" varchar NOT NULL,
  	"entity_type" "enum_payload_llm_instructions_entity_type" NOT NULL,
  	"additional_instructions" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_llm_instructions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" varchar NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "platform_settings" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"commission_percent" numeric DEFAULT 5 NOT NULL,
  	"service_fee_percent" numeric DEFAULT 2 NOT NULL,
  	"email_delivery_enabled" boolean DEFAULT false NOT NULL,
  	"minimum_payout" numeric DEFAULT 10000 NOT NULL,
  	"support_email" varchar DEFAULT 'support@azortix.com' NOT NULL,
  	"sales_enabled" boolean DEFAULT true NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "platform_settings_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  CREATE TABLE "_platform_settings_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"version_commission_percent" numeric DEFAULT 5 NOT NULL,
  	"version_service_fee_percent" numeric DEFAULT 2 NOT NULL,
  	"version_email_delivery_enabled" boolean DEFAULT false NOT NULL,
  	"version_minimum_payout" numeric DEFAULT 10000 NOT NULL,
  	"version_support_email" varchar DEFAULT 'support@azortix.com' NOT NULL,
  	"version_sales_enabled" boolean DEFAULT true NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_platform_settings_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" uuid,
  	"users_id" uuid
  );
  
  ALTER TABLE "admins_sessions" ADD CONSTRAINT "admins_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "admins_rels" ADD CONSTRAINT "admins_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "admins_rels" ADD CONSTRAINT "admins_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "admins_rels" ADD CONSTRAINT "admins_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media__h_folders_id_folders_id_fk" FOREIGN KEY ("_h_folders_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_rels" ADD CONSTRAINT "media_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_rels" ADD CONSTRAINT "media_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_rels" ADD CONSTRAINT "media_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_rels" ADD CONSTRAINT "media_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_media_v" ADD CONSTRAINT "_media_v_parent_id_media_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_media_v" ADD CONSTRAINT "_media_v_version__h_folders_id_folders_id_fk" FOREIGN KEY ("version__h_folders_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_media_v_rels" ADD CONSTRAINT "_media_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_media_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_media_v_rels" ADD CONSTRAINT "_media_v_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_media_v_rels" ADD CONSTRAINT "_media_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_media_v_rels" ADD CONSTRAINT "_media_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "folders" ADD CONSTRAINT "folders__h_folders_id_folders_id_fk" FOREIGN KEY ("_h_folders_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "folders_rels" ADD CONSTRAINT "folders_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "folders_rels" ADD CONSTRAINT "folders_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "folders_rels" ADD CONSTRAINT "folders_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_folders_v" ADD CONSTRAINT "_folders_v_parent_id_folders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_folders_v" ADD CONSTRAINT "_folders_v_version__h_folders_id_folders_id_fk" FOREIGN KEY ("version__h_folders_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_folders_v_rels" ADD CONSTRAINT "_folders_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_folders_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_folders_v_rels" ADD CONSTRAINT "_folders_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_folders_v_rels" ADD CONSTRAINT "_folders_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tags" ADD CONSTRAINT "tags__h_tags_id_tags_id_fk" FOREIGN KEY ("_h_tags_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tags_rels" ADD CONSTRAINT "tags_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tags_rels" ADD CONSTRAINT "tags_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tags_rels" ADD CONSTRAINT "tags_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tags_v" ADD CONSTRAINT "_tags_v_parent_id_tags_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tags_v" ADD CONSTRAINT "_tags_v_version__h_tags_id_tags_id_fk" FOREIGN KEY ("version__h_tags_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tags_v_rels" ADD CONSTRAINT "_tags_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_tags_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tags_v_rels" ADD CONSTRAINT "_tags_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tags_v_rels" ADD CONSTRAINT "_tags_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_users_v_version_sessions" ADD CONSTRAINT "_users_v_version_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_users_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_users_v" ADD CONSTRAINT "_users_v_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_users_v_rels" ADD CONSTRAINT "_users_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_users_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_users_v_rels" ADD CONSTRAINT "_users_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_users_v_rels" ADD CONSTRAINT "_users_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_previous_slugs" ADD CONSTRAINT "events_previous_slugs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_sessions" ADD CONSTRAINT "events_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_attendee_questions_options" ADD CONSTRAINT "events_attendee_questions_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events_attendee_questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_attendee_questions" ADD CONSTRAINT "events_attendee_questions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_version_previous_slugs" ADD CONSTRAINT "_events_v_version_previous_slugs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_version_sessions" ADD CONSTRAINT "_events_v_version_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_version_attendee_questions_options" ADD CONSTRAINT "_events_v_version_attendee_questions_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v_version_attendee_questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_version_attendee_questions" ADD CONSTRAINT "_events_v_version_attendee_questions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_parent_id_events_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_organizer_id_users_id_fk" FOREIGN KEY ("version_organizer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_reviewed_by_id_users_id_fk" FOREIGN KEY ("version_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v_rels" ADD CONSTRAINT "_events_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_rels" ADD CONSTRAINT "_events_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_rels" ADD CONSTRAINT "_events_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_rels" ADD CONSTRAINT "_events_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ticket_types_perks" ADD CONSTRAINT "ticket_types_perks_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ticket_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ticket_types_rels" ADD CONSTRAINT "ticket_types_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."ticket_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ticket_types_rels" ADD CONSTRAINT "ticket_types_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ticket_types_rels" ADD CONSTRAINT "ticket_types_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_ticket_types_v_version_perks" ADD CONSTRAINT "_ticket_types_v_version_perks_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_ticket_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_ticket_types_v" ADD CONSTRAINT "_ticket_types_v_parent_id_ticket_types_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."ticket_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_ticket_types_v" ADD CONSTRAINT "_ticket_types_v_version_event_id_events_id_fk" FOREIGN KEY ("version_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_ticket_types_v_rels" ADD CONSTRAINT "_ticket_types_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_ticket_types_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_ticket_types_v_rels" ADD CONSTRAINT "_ticket_types_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_ticket_types_v_rels" ADD CONSTRAINT "_ticket_types_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "organizer_profiles" ADD CONSTRAINT "organizer_profiles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "organizer_profiles" ADD CONSTRAINT "organizer_profiles_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "organizer_profiles_rels" ADD CONSTRAINT "organizer_profiles_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."organizer_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "organizer_profiles_rels" ADD CONSTRAINT "organizer_profiles_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "organizer_profiles_rels" ADD CONSTRAINT "organizer_profiles_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_organizer_profiles_v" ADD CONSTRAINT "_organizer_profiles_v_parent_id_organizer_profiles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."organizer_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_organizer_profiles_v" ADD CONSTRAINT "_organizer_profiles_v_version_owner_id_users_id_fk" FOREIGN KEY ("version_owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_organizer_profiles_v" ADD CONSTRAINT "_organizer_profiles_v_version_logo_id_media_id_fk" FOREIGN KEY ("version_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_organizer_profiles_v_rels" ADD CONSTRAINT "_organizer_profiles_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_organizer_profiles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_organizer_profiles_v_rels" ADD CONSTRAINT "_organizer_profiles_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_organizer_profiles_v_rels" ADD CONSTRAINT "_organizer_profiles_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "discounts" ADD CONSTRAINT "discounts_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "discounts" ADD CONSTRAINT "discounts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "discounts_rels" ADD CONSTRAINT "discounts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "discounts_rels" ADD CONSTRAINT "discounts_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "discounts_rels" ADD CONSTRAINT "discounts_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_discounts_v" ADD CONSTRAINT "_discounts_v_parent_id_discounts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."discounts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_discounts_v" ADD CONSTRAINT "_discounts_v_version_organizer_id_users_id_fk" FOREIGN KEY ("version_organizer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_discounts_v" ADD CONSTRAINT "_discounts_v_version_event_id_events_id_fk" FOREIGN KEY ("version_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_discounts_v_rels" ADD CONSTRAINT "_discounts_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_discounts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_discounts_v_rels" ADD CONSTRAINT "_discounts_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_discounts_v_rels" ADD CONSTRAINT "_discounts_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "guest_list_entries" ADD CONSTRAINT "guest_list_entries_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "guest_list_entries" ADD CONSTRAINT "guest_list_entries_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "guest_list_entries_rels" ADD CONSTRAINT "guest_list_entries_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."guest_list_entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "guest_list_entries_rels" ADD CONSTRAINT "guest_list_entries_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "guest_list_entries_rels" ADD CONSTRAINT "guest_list_entries_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guest_list_entries_v" ADD CONSTRAINT "_guest_list_entries_v_parent_id_guest_list_entries_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."guest_list_entries"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_guest_list_entries_v" ADD CONSTRAINT "_guest_list_entries_v_version_organizer_id_users_id_fk" FOREIGN KEY ("version_organizer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_guest_list_entries_v" ADD CONSTRAINT "_guest_list_entries_v_version_event_id_events_id_fk" FOREIGN KEY ("version_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_guest_list_entries_v_rels" ADD CONSTRAINT "_guest_list_entries_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_guest_list_entries_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guest_list_entries_v_rels" ADD CONSTRAINT "_guest_list_entries_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guest_list_entries_v_rels" ADD CONSTRAINT "_guest_list_entries_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "announcements" ADD CONSTRAINT "announcements_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "announcements" ADD CONSTRAINT "announcements_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "announcements_rels" ADD CONSTRAINT "announcements_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "announcements_rels" ADD CONSTRAINT "announcements_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "announcements_rels" ADD CONSTRAINT "announcements_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_announcements_v" ADD CONSTRAINT "_announcements_v_parent_id_announcements_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."announcements"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_announcements_v" ADD CONSTRAINT "_announcements_v_version_organizer_id_users_id_fk" FOREIGN KEY ("version_organizer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_announcements_v" ADD CONSTRAINT "_announcements_v_version_event_id_events_id_fk" FOREIGN KEY ("version_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_announcements_v_rels" ADD CONSTRAINT "_announcements_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_announcements_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_announcements_v_rels" ADD CONSTRAINT "_announcements_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_announcements_v_rels" ADD CONSTRAINT "_announcements_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "event_collections" ADD CONSTRAINT "event_collections_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "event_collections_rels" ADD CONSTRAINT "event_collections_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."event_collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "event_collections_rels" ADD CONSTRAINT "event_collections_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "event_collections_rels" ADD CONSTRAINT "event_collections_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "event_collections_rels" ADD CONSTRAINT "event_collections_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_event_collections_v" ADD CONSTRAINT "_event_collections_v_parent_id_event_collections_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."event_collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_event_collections_v" ADD CONSTRAINT "_event_collections_v_version_organizer_id_users_id_fk" FOREIGN KEY ("version_organizer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_event_collections_v_rels" ADD CONSTRAINT "_event_collections_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_event_collections_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_event_collections_v_rels" ADD CONSTRAINT "_event_collections_v_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_event_collections_v_rels" ADD CONSTRAINT "_event_collections_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_event_collections_v_rels" ADD CONSTRAINT "_event_collections_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bank_verifications" ADD CONSTRAINT "bank_verifications_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bank_verifications_rels" ADD CONSTRAINT "bank_verifications_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."bank_verifications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bank_verifications_rels" ADD CONSTRAINT "bank_verifications_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bank_verifications_rels" ADD CONSTRAINT "bank_verifications_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_bank_verifications_v" ADD CONSTRAINT "_bank_verifications_v_parent_id_bank_verifications_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."bank_verifications"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_bank_verifications_v" ADD CONSTRAINT "_bank_verifications_v_version_organizer_id_users_id_fk" FOREIGN KEY ("version_organizer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_bank_verifications_v_rels" ADD CONSTRAINT "_bank_verifications_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_bank_verifications_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_bank_verifications_v_rels" ADD CONSTRAINT "_bank_verifications_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_bank_verifications_v_rels" ADD CONSTRAINT "_bank_verifications_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bank_change_appeals_audit_history" ADD CONSTRAINT "bank_change_appeals_audit_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."bank_change_appeals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bank_change_appeals" ADD CONSTRAINT "bank_change_appeals_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bank_change_appeals" ADD CONSTRAINT "bank_change_appeals_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bank_change_appeals" ADD CONSTRAINT "bank_change_appeals_overridden_by_id_users_id_fk" FOREIGN KEY ("overridden_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bank_change_appeals_rels" ADD CONSTRAINT "bank_change_appeals_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."bank_change_appeals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bank_change_appeals_rels" ADD CONSTRAINT "bank_change_appeals_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bank_change_appeals_rels" ADD CONSTRAINT "bank_change_appeals_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_bank_change_appeals_v_version_audit_history" ADD CONSTRAINT "_bank_change_appeals_v_version_audit_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_bank_change_appeals_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_bank_change_appeals_v" ADD CONSTRAINT "_bank_change_appeals_v_parent_id_bank_change_appeals_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."bank_change_appeals"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_bank_change_appeals_v" ADD CONSTRAINT "_bank_change_appeals_v_version_organizer_id_users_id_fk" FOREIGN KEY ("version_organizer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_bank_change_appeals_v" ADD CONSTRAINT "_bank_change_appeals_v_version_reviewed_by_id_users_id_fk" FOREIGN KEY ("version_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_bank_change_appeals_v" ADD CONSTRAINT "_bank_change_appeals_v_version_overridden_by_id_users_id_fk" FOREIGN KEY ("version_overridden_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_bank_change_appeals_v_rels" ADD CONSTRAINT "_bank_change_appeals_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_bank_change_appeals_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_bank_change_appeals_v_rels" ADD CONSTRAINT "_bank_change_appeals_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_bank_change_appeals_v_rels" ADD CONSTRAINT "_bank_change_appeals_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "free_ticket_links" ADD CONSTRAINT "free_ticket_links_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "free_ticket_links" ADD CONSTRAINT "free_ticket_links_ticket_type_id_ticket_types_id_fk" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "free_ticket_links" ADD CONSTRAINT "free_ticket_links_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "free_ticket_links" ADD CONSTRAINT "free_ticket_links_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "free_ticket_links_rels" ADD CONSTRAINT "free_ticket_links_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."free_ticket_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "free_ticket_links_rels" ADD CONSTRAINT "free_ticket_links_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "free_ticket_links_rels" ADD CONSTRAINT "free_ticket_links_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_free_ticket_links_v" ADD CONSTRAINT "_free_ticket_links_v_parent_id_free_ticket_links_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."free_ticket_links"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_free_ticket_links_v" ADD CONSTRAINT "_free_ticket_links_v_version_event_id_events_id_fk" FOREIGN KEY ("version_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_free_ticket_links_v" ADD CONSTRAINT "_free_ticket_links_v_version_ticket_type_id_ticket_types_id_fk" FOREIGN KEY ("version_ticket_type_id") REFERENCES "public"."ticket_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_free_ticket_links_v" ADD CONSTRAINT "_free_ticket_links_v_version_organizer_id_users_id_fk" FOREIGN KEY ("version_organizer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_free_ticket_links_v" ADD CONSTRAINT "_free_ticket_links_v_version_ticket_id_tickets_id_fk" FOREIGN KEY ("version_ticket_id") REFERENCES "public"."tickets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_free_ticket_links_v_rels" ADD CONSTRAINT "_free_ticket_links_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_free_ticket_links_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_free_ticket_links_v_rels" ADD CONSTRAINT "_free_ticket_links_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_free_ticket_links_v_rels" ADD CONSTRAINT "_free_ticket_links_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_ticket_type_id_ticket_types_id_fk" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_attendee_answers" ADD CONSTRAINT "orders_attendee_answers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_rels" ADD CONSTRAINT "orders_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_rels" ADD CONSTRAINT "orders_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_rels" ADD CONSTRAINT "orders_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_orders_v_version_items" ADD CONSTRAINT "_orders_v_version_items_ticket_type_id_ticket_types_id_fk" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_orders_v_version_items" ADD CONSTRAINT "_orders_v_version_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_orders_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_orders_v_version_attendee_answers" ADD CONSTRAINT "_orders_v_version_attendee_answers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_orders_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_orders_v" ADD CONSTRAINT "_orders_v_parent_id_orders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_orders_v" ADD CONSTRAINT "_orders_v_version_event_id_events_id_fk" FOREIGN KEY ("version_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_orders_v_rels" ADD CONSTRAINT "_orders_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_orders_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_orders_v_rels" ADD CONSTRAINT "_orders_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_orders_v_rels" ADD CONSTRAINT "_orders_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transactions_rels" ADD CONSTRAINT "transactions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "transactions_rels" ADD CONSTRAINT "transactions_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "transactions_rels" ADD CONSTRAINT "transactions_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_transactions_v" ADD CONSTRAINT "_transactions_v_parent_id_transactions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_transactions_v" ADD CONSTRAINT "_transactions_v_version_order_id_orders_id_fk" FOREIGN KEY ("version_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_transactions_v" ADD CONSTRAINT "_transactions_v_version_event_id_events_id_fk" FOREIGN KEY ("version_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_transactions_v_rels" ADD CONSTRAINT "_transactions_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_transactions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_transactions_v_rels" ADD CONSTRAINT "_transactions_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_transactions_v_rels" ADD CONSTRAINT "_transactions_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tickets" ADD CONSTRAINT "tickets_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tickets" ADD CONSTRAINT "tickets_ticket_type_id_ticket_types_id_fk" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tickets" ADD CONSTRAINT "tickets_checked_in_by_id_users_id_fk" FOREIGN KEY ("checked_in_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tickets_rels" ADD CONSTRAINT "tickets_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tickets_rels" ADD CONSTRAINT "tickets_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tickets_rels" ADD CONSTRAINT "tickets_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tickets_v" ADD CONSTRAINT "_tickets_v_parent_id_tickets_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tickets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tickets_v" ADD CONSTRAINT "_tickets_v_version_order_id_orders_id_fk" FOREIGN KEY ("version_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tickets_v" ADD CONSTRAINT "_tickets_v_version_event_id_events_id_fk" FOREIGN KEY ("version_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tickets_v" ADD CONSTRAINT "_tickets_v_version_ticket_type_id_ticket_types_id_fk" FOREIGN KEY ("version_ticket_type_id") REFERENCES "public"."ticket_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tickets_v" ADD CONSTRAINT "_tickets_v_version_checked_in_by_id_users_id_fk" FOREIGN KEY ("version_checked_in_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tickets_v_rels" ADD CONSTRAINT "_tickets_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_tickets_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tickets_v_rels" ADD CONSTRAINT "_tickets_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tickets_v_rels" ADD CONSTRAINT "_tickets_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "team_memberships_permissions" ADD CONSTRAINT "team_memberships_permissions_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."team_memberships"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "team_memberships_rels" ADD CONSTRAINT "team_memberships_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."team_memberships"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "team_memberships_rels" ADD CONSTRAINT "team_memberships_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "team_memberships_rels" ADD CONSTRAINT "team_memberships_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_team_memberships_v_version_permissions" ADD CONSTRAINT "_team_memberships_v_version_permissions_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_team_memberships_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_team_memberships_v" ADD CONSTRAINT "_team_memberships_v_parent_id_team_memberships_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."team_memberships"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_team_memberships_v" ADD CONSTRAINT "_team_memberships_v_version_organizer_id_users_id_fk" FOREIGN KEY ("version_organizer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_team_memberships_v_rels" ADD CONSTRAINT "_team_memberships_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_team_memberships_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_team_memberships_v_rels" ADD CONSTRAINT "_team_memberships_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_team_memberships_v_rels" ADD CONSTRAINT "_team_memberships_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_initiated_by_id_users_id_fk" FOREIGN KEY ("initiated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payout_requests_rels" ADD CONSTRAINT "payout_requests_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payout_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payout_requests_rels" ADD CONSTRAINT "payout_requests_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payout_requests_rels" ADD CONSTRAINT "payout_requests_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_payout_requests_v" ADD CONSTRAINT "_payout_requests_v_parent_id_payout_requests_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payout_requests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_payout_requests_v" ADD CONSTRAINT "_payout_requests_v_version_organizer_id_users_id_fk" FOREIGN KEY ("version_organizer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_payout_requests_v" ADD CONSTRAINT "_payout_requests_v_version_event_id_events_id_fk" FOREIGN KEY ("version_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_payout_requests_v" ADD CONSTRAINT "_payout_requests_v_version_initiated_by_id_users_id_fk" FOREIGN KEY ("version_initiated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_payout_requests_v" ADD CONSTRAINT "_payout_requests_v_version_reviewed_by_id_users_id_fk" FOREIGN KEY ("version_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_payout_requests_v_rels" ADD CONSTRAINT "_payout_requests_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_payout_requests_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_payout_requests_v_rels" ADD CONSTRAINT "_payout_requests_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_payout_requests_v_rels" ADD CONSTRAINT "_payout_requests_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "refunds" ADD CONSTRAINT "refunds_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "refunds" ADD CONSTRAINT "refunds_initiated_by_id_users_id_fk" FOREIGN KEY ("initiated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "refunds_rels" ADD CONSTRAINT "refunds_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."refunds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "refunds_rels" ADD CONSTRAINT "refunds_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "refunds_rels" ADD CONSTRAINT "refunds_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_refunds_v" ADD CONSTRAINT "_refunds_v_parent_id_refunds_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."refunds"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_refunds_v" ADD CONSTRAINT "_refunds_v_version_order_id_orders_id_fk" FOREIGN KEY ("version_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_refunds_v" ADD CONSTRAINT "_refunds_v_version_event_id_events_id_fk" FOREIGN KEY ("version_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_refunds_v" ADD CONSTRAINT "_refunds_v_version_initiated_by_id_users_id_fk" FOREIGN KEY ("version_initiated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_refunds_v_rels" ADD CONSTRAINT "_refunds_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_refunds_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_refunds_v_rels" ADD CONSTRAINT "_refunds_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_refunds_v_rels" ADD CONSTRAINT "_refunds_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "complaints_rels" ADD CONSTRAINT "complaints_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."complaints"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "complaints_rels" ADD CONSTRAINT "complaints_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "complaints_rels" ADD CONSTRAINT "complaints_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_complaints_v" ADD CONSTRAINT "_complaints_v_parent_id_complaints_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."complaints"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_complaints_v_rels" ADD CONSTRAINT "_complaints_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_complaints_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_complaints_v_rels" ADD CONSTRAINT "_complaints_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_complaints_v_rels" ADD CONSTRAINT "_complaints_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "subscribers_rels" ADD CONSTRAINT "subscribers_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "subscribers_rels" ADD CONSTRAINT "subscribers_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "subscribers_rels" ADD CONSTRAINT "subscribers_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_subscribers_v" ADD CONSTRAINT "_subscribers_v_parent_id_subscribers_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."subscribers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_subscribers_v_rels" ADD CONSTRAINT "_subscribers_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_subscribers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_subscribers_v_rels" ADD CONSTRAINT "_subscribers_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_subscribers_v_rels" ADD CONSTRAINT "_subscribers_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audit_logs_rels" ADD CONSTRAINT "audit_logs_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."audit_logs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "audit_logs_rels" ADD CONSTRAINT "audit_logs_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "audit_logs_rels" ADD CONSTRAINT "audit_logs_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_audit_logs_v" ADD CONSTRAINT "_audit_logs_v_parent_id_audit_logs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."audit_logs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_audit_logs_v" ADD CONSTRAINT "_audit_logs_v_version_actor_id_users_id_fk" FOREIGN KEY ("version_actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_audit_logs_v_rels" ADD CONSTRAINT "_audit_logs_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_audit_logs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_audit_logs_v_rels" ADD CONSTRAINT "_audit_logs_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_audit_logs_v_rels" ADD CONSTRAINT "_audit_logs_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_folders_fk" FOREIGN KEY ("folders_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ticket_types_fk" FOREIGN KEY ("ticket_types_id") REFERENCES "public"."ticket_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_organizer_profiles_fk" FOREIGN KEY ("organizer_profiles_id") REFERENCES "public"."organizer_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_discounts_fk" FOREIGN KEY ("discounts_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_guest_list_entries_fk" FOREIGN KEY ("guest_list_entries_id") REFERENCES "public"."guest_list_entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_announcements_fk" FOREIGN KEY ("announcements_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_event_collections_fk" FOREIGN KEY ("event_collections_id") REFERENCES "public"."event_collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_bank_verifications_fk" FOREIGN KEY ("bank_verifications_id") REFERENCES "public"."bank_verifications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_bank_change_appeals_fk" FOREIGN KEY ("bank_change_appeals_id") REFERENCES "public"."bank_change_appeals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_free_ticket_links_fk" FOREIGN KEY ("free_ticket_links_id") REFERENCES "public"."free_ticket_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_transactions_fk" FOREIGN KEY ("transactions_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tickets_fk" FOREIGN KEY ("tickets_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_team_memberships_fk" FOREIGN KEY ("team_memberships_id") REFERENCES "public"."team_memberships"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payout_requests_fk" FOREIGN KEY ("payout_requests_id") REFERENCES "public"."payout_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_refunds_fk" FOREIGN KEY ("refunds_id") REFERENCES "public"."refunds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_complaints_fk" FOREIGN KEY ("complaints_id") REFERENCES "public"."complaints"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subscribers_fk" FOREIGN KEY ("subscribers_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_logs_fk" FOREIGN KEY ("audit_logs_id") REFERENCES "public"."audit_logs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_llm_instructions_rels" ADD CONSTRAINT "payload_llm_instructions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_llm_instructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_llm_instructions_rels" ADD CONSTRAINT "payload_llm_instructions_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_llm_instructions_rels" ADD CONSTRAINT "payload_llm_instructions_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "platform_settings_rels" ADD CONSTRAINT "platform_settings_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."platform_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "platform_settings_rels" ADD CONSTRAINT "platform_settings_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "platform_settings_rels" ADD CONSTRAINT "platform_settings_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_platform_settings_v_rels" ADD CONSTRAINT "_platform_settings_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_platform_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_platform_settings_v_rels" ADD CONSTRAINT "_platform_settings_v_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_platform_settings_v_rels" ADD CONSTRAINT "_platform_settings_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "admins_sessions_order_idx" ON "admins_sessions" USING btree ("_order");
  CREATE INDEX "admins_sessions_parent_id_idx" ON "admins_sessions" USING btree ("_parent_id");
  CREATE INDEX "admins_updated_at_idx" ON "admins" USING btree ("updated_at");
  CREATE INDEX "admins_created_at_idx" ON "admins" USING btree ("created_at");
  CREATE UNIQUE INDEX "admins_email_idx" ON "admins" USING btree ("email");
  CREATE INDEX "admins_rels_order_idx" ON "admins_rels" USING btree ("order");
  CREATE INDEX "admins_rels_parent_idx" ON "admins_rels" USING btree ("parent_id");
  CREATE INDEX "admins_rels_path_idx" ON "admins_rels" USING btree ("path");
  CREATE INDEX "admins_rels_admins_id_idx" ON "admins_rels" USING btree ("admins_id");
  CREATE INDEX "admins_rels_users_id_idx" ON "admins_rels" USING btree ("users_id");
  CREATE INDEX "media__h_folders_idx" ON "media" USING btree ("_h_folders_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_original_original_filename_idx" ON "media" USING btree ("original_filename");
  CREATE INDEX "media_rels_order_idx" ON "media_rels" USING btree ("order");
  CREATE INDEX "media_rels_parent_idx" ON "media_rels" USING btree ("parent_id");
  CREATE INDEX "media_rels_path_idx" ON "media_rels" USING btree ("path");
  CREATE INDEX "media_rels_tags_id_idx" ON "media_rels" USING btree ("tags_id");
  CREATE INDEX "media_rels_admins_id_idx" ON "media_rels" USING btree ("admins_id");
  CREATE INDEX "media_rels_users_id_idx" ON "media_rels" USING btree ("users_id");
  CREATE INDEX "_media_v_parent_idx" ON "_media_v" USING btree ("parent_id");
  CREATE INDEX "_media_v_version_version__h_folders_idx" ON "_media_v" USING btree ("version__h_folders_id");
  CREATE INDEX "_media_v_version_version_updated_at_idx" ON "_media_v" USING btree ("version_updated_at");
  CREATE INDEX "_media_v_version_version_created_at_idx" ON "_media_v" USING btree ("version_created_at");
  CREATE INDEX "_media_v_version_version_filename_idx" ON "_media_v" USING btree ("version_filename");
  CREATE INDEX "_media_v_version_original_version_original_filename_idx" ON "_media_v" USING btree ("version_original_filename");
  CREATE INDEX "_media_v_created_at_idx" ON "_media_v" USING btree ("created_at");
  CREATE INDEX "_media_v_updated_at_idx" ON "_media_v" USING btree ("updated_at");
  CREATE INDEX "_media_v_rels_order_idx" ON "_media_v_rels" USING btree ("order");
  CREATE INDEX "_media_v_rels_parent_idx" ON "_media_v_rels" USING btree ("parent_id");
  CREATE INDEX "_media_v_rels_path_idx" ON "_media_v_rels" USING btree ("path");
  CREATE INDEX "_media_v_rels_tags_id_idx" ON "_media_v_rels" USING btree ("tags_id");
  CREATE INDEX "_media_v_rels_admins_id_idx" ON "_media_v_rels" USING btree ("admins_id");
  CREATE INDEX "_media_v_rels_users_id_idx" ON "_media_v_rels" USING btree ("users_id");
  CREATE INDEX "folders__h_folders_idx" ON "folders" USING btree ("_h_folders_id");
  CREATE INDEX "folders_updated_at_idx" ON "folders" USING btree ("updated_at");
  CREATE INDEX "folders_created_at_idx" ON "folders" USING btree ("created_at");
  CREATE INDEX "folders_rels_order_idx" ON "folders_rels" USING btree ("order");
  CREATE INDEX "folders_rels_parent_idx" ON "folders_rels" USING btree ("parent_id");
  CREATE INDEX "folders_rels_path_idx" ON "folders_rels" USING btree ("path");
  CREATE INDEX "folders_rels_admins_id_idx" ON "folders_rels" USING btree ("admins_id");
  CREATE INDEX "folders_rels_users_id_idx" ON "folders_rels" USING btree ("users_id");
  CREATE INDEX "_folders_v_parent_idx" ON "_folders_v" USING btree ("parent_id");
  CREATE INDEX "_folders_v_version_version__h_folders_idx" ON "_folders_v" USING btree ("version__h_folders_id");
  CREATE INDEX "_folders_v_version_version_updated_at_idx" ON "_folders_v" USING btree ("version_updated_at");
  CREATE INDEX "_folders_v_version_version_created_at_idx" ON "_folders_v" USING btree ("version_created_at");
  CREATE INDEX "_folders_v_created_at_idx" ON "_folders_v" USING btree ("created_at");
  CREATE INDEX "_folders_v_updated_at_idx" ON "_folders_v" USING btree ("updated_at");
  CREATE INDEX "_folders_v_rels_order_idx" ON "_folders_v_rels" USING btree ("order");
  CREATE INDEX "_folders_v_rels_parent_idx" ON "_folders_v_rels" USING btree ("parent_id");
  CREATE INDEX "_folders_v_rels_path_idx" ON "_folders_v_rels" USING btree ("path");
  CREATE INDEX "_folders_v_rels_admins_id_idx" ON "_folders_v_rels" USING btree ("admins_id");
  CREATE INDEX "_folders_v_rels_users_id_idx" ON "_folders_v_rels" USING btree ("users_id");
  CREATE INDEX "tags__h_tags_idx" ON "tags" USING btree ("_h_tags_id");
  CREATE INDEX "tags_updated_at_idx" ON "tags" USING btree ("updated_at");
  CREATE INDEX "tags_created_at_idx" ON "tags" USING btree ("created_at");
  CREATE INDEX "tags_rels_order_idx" ON "tags_rels" USING btree ("order");
  CREATE INDEX "tags_rels_parent_idx" ON "tags_rels" USING btree ("parent_id");
  CREATE INDEX "tags_rels_path_idx" ON "tags_rels" USING btree ("path");
  CREATE INDEX "tags_rels_admins_id_idx" ON "tags_rels" USING btree ("admins_id");
  CREATE INDEX "tags_rels_users_id_idx" ON "tags_rels" USING btree ("users_id");
  CREATE INDEX "_tags_v_parent_idx" ON "_tags_v" USING btree ("parent_id");
  CREATE INDEX "_tags_v_version_version__h_tags_idx" ON "_tags_v" USING btree ("version__h_tags_id");
  CREATE INDEX "_tags_v_version_version_updated_at_idx" ON "_tags_v" USING btree ("version_updated_at");
  CREATE INDEX "_tags_v_version_version_created_at_idx" ON "_tags_v" USING btree ("version_created_at");
  CREATE INDEX "_tags_v_created_at_idx" ON "_tags_v" USING btree ("created_at");
  CREATE INDEX "_tags_v_updated_at_idx" ON "_tags_v" USING btree ("updated_at");
  CREATE INDEX "_tags_v_rels_order_idx" ON "_tags_v_rels" USING btree ("order");
  CREATE INDEX "_tags_v_rels_parent_idx" ON "_tags_v_rels" USING btree ("parent_id");
  CREATE INDEX "_tags_v_rels_path_idx" ON "_tags_v_rels" USING btree ("path");
  CREATE INDEX "_tags_v_rels_admins_id_idx" ON "_tags_v_rels" USING btree ("admins_id");
  CREATE INDEX "_tags_v_rels_users_id_idx" ON "_tags_v_rels" USING btree ("users_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "users_rels_order_idx" ON "users_rels" USING btree ("order");
  CREATE INDEX "users_rels_parent_idx" ON "users_rels" USING btree ("parent_id");
  CREATE INDEX "users_rels_path_idx" ON "users_rels" USING btree ("path");
  CREATE INDEX "users_rels_admins_id_idx" ON "users_rels" USING btree ("admins_id");
  CREATE INDEX "users_rels_users_id_idx" ON "users_rels" USING btree ("users_id");
  CREATE INDEX "_users_v_version_sessions_order_idx" ON "_users_v_version_sessions" USING btree ("_order");
  CREATE INDEX "_users_v_version_sessions_parent_id_idx" ON "_users_v_version_sessions" USING btree ("_parent_id");
  CREATE INDEX "_users_v_parent_idx" ON "_users_v" USING btree ("parent_id");
  CREATE INDEX "_users_v_version_version_updated_at_idx" ON "_users_v" USING btree ("version_updated_at");
  CREATE INDEX "_users_v_version_version_created_at_idx" ON "_users_v" USING btree ("version_created_at");
  CREATE INDEX "_users_v_version_version_email_idx" ON "_users_v" USING btree ("version_email");
  CREATE INDEX "_users_v_created_at_idx" ON "_users_v" USING btree ("created_at");
  CREATE INDEX "_users_v_updated_at_idx" ON "_users_v" USING btree ("updated_at");
  CREATE INDEX "_users_v_rels_order_idx" ON "_users_v_rels" USING btree ("order");
  CREATE INDEX "_users_v_rels_parent_idx" ON "_users_v_rels" USING btree ("parent_id");
  CREATE INDEX "_users_v_rels_path_idx" ON "_users_v_rels" USING btree ("path");
  CREATE INDEX "_users_v_rels_admins_id_idx" ON "_users_v_rels" USING btree ("admins_id");
  CREATE INDEX "_users_v_rels_users_id_idx" ON "_users_v_rels" USING btree ("users_id");
  CREATE INDEX "events_previous_slugs_order_idx" ON "events_previous_slugs" USING btree ("_order");
  CREATE INDEX "events_previous_slugs_parent_id_idx" ON "events_previous_slugs" USING btree ("_parent_id");
  CREATE INDEX "events_sessions_order_idx" ON "events_sessions" USING btree ("_order");
  CREATE INDEX "events_sessions_parent_id_idx" ON "events_sessions" USING btree ("_parent_id");
  CREATE INDEX "events_attendee_questions_options_order_idx" ON "events_attendee_questions_options" USING btree ("_order");
  CREATE INDEX "events_attendee_questions_options_parent_id_idx" ON "events_attendee_questions_options" USING btree ("_parent_id");
  CREATE INDEX "events_attendee_questions_order_idx" ON "events_attendee_questions" USING btree ("_order");
  CREATE INDEX "events_attendee_questions_parent_id_idx" ON "events_attendee_questions" USING btree ("_parent_id");
  CREATE INDEX "events_organizer_idx" ON "events" USING btree ("organizer_id");
  CREATE INDEX "events_title_idx" ON "events" USING btree ("title");
  CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");
  CREATE INDEX "events_client_request_id_idx" ON "events" USING btree ("client_request_id");
  CREATE INDEX "events_hero_image_idx" ON "events" USING btree ("hero_image_id");
  CREATE INDEX "events_starts_at_idx" ON "events" USING btree ("starts_at");
  CREATE INDEX "events_reviewed_by_idx" ON "events" USING btree ("reviewed_by_id");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "events__status_idx" ON "events" USING btree ("_status");
  CREATE INDEX "events_rels_order_idx" ON "events_rels" USING btree ("order");
  CREATE INDEX "events_rels_parent_idx" ON "events_rels" USING btree ("parent_id");
  CREATE INDEX "events_rels_path_idx" ON "events_rels" USING btree ("path");
  CREATE INDEX "events_rels_media_id_idx" ON "events_rels" USING btree ("media_id");
  CREATE INDEX "events_rels_admins_id_idx" ON "events_rels" USING btree ("admins_id");
  CREATE INDEX "events_rels_users_id_idx" ON "events_rels" USING btree ("users_id");
  CREATE INDEX "_events_v_version_previous_slugs_order_idx" ON "_events_v_version_previous_slugs" USING btree ("_order");
  CREATE INDEX "_events_v_version_previous_slugs_parent_id_idx" ON "_events_v_version_previous_slugs" USING btree ("_parent_id");
  CREATE INDEX "_events_v_version_sessions_order_idx" ON "_events_v_version_sessions" USING btree ("_order");
  CREATE INDEX "_events_v_version_sessions_parent_id_idx" ON "_events_v_version_sessions" USING btree ("_parent_id");
  CREATE INDEX "_events_v_version_attendee_questions_options_order_idx" ON "_events_v_version_attendee_questions_options" USING btree ("_order");
  CREATE INDEX "_events_v_version_attendee_questions_options_parent_id_idx" ON "_events_v_version_attendee_questions_options" USING btree ("_parent_id");
  CREATE INDEX "_events_v_version_attendee_questions_order_idx" ON "_events_v_version_attendee_questions" USING btree ("_order");
  CREATE INDEX "_events_v_version_attendee_questions_parent_id_idx" ON "_events_v_version_attendee_questions" USING btree ("_parent_id");
  CREATE INDEX "_events_v_parent_idx" ON "_events_v" USING btree ("parent_id");
  CREATE INDEX "_events_v_version_version_organizer_idx" ON "_events_v" USING btree ("version_organizer_id");
  CREATE INDEX "_events_v_version_version_title_idx" ON "_events_v" USING btree ("version_title");
  CREATE INDEX "_events_v_version_version_slug_idx" ON "_events_v" USING btree ("version_slug");
  CREATE INDEX "_events_v_version_version_client_request_id_idx" ON "_events_v" USING btree ("version_client_request_id");
  CREATE INDEX "_events_v_version_version_hero_image_idx" ON "_events_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_events_v_version_version_starts_at_idx" ON "_events_v" USING btree ("version_starts_at");
  CREATE INDEX "_events_v_version_version_reviewed_by_idx" ON "_events_v" USING btree ("version_reviewed_by_id");
  CREATE INDEX "_events_v_version_version_updated_at_idx" ON "_events_v" USING btree ("version_updated_at");
  CREATE INDEX "_events_v_version_version_created_at_idx" ON "_events_v" USING btree ("version_created_at");
  CREATE INDEX "_events_v_version_version__status_idx" ON "_events_v" USING btree ("version__status");
  CREATE INDEX "_events_v_created_at_idx" ON "_events_v" USING btree ("created_at");
  CREATE INDEX "_events_v_updated_at_idx" ON "_events_v" USING btree ("updated_at");
  CREATE INDEX "_events_v_published_locale_idx" ON "_events_v" USING btree ("published_locale");
  CREATE INDEX "_events_v_latest_idx" ON "_events_v" USING btree ("latest");
  CREATE INDEX "_events_v_rels_order_idx" ON "_events_v_rels" USING btree ("order");
  CREATE INDEX "_events_v_rels_parent_idx" ON "_events_v_rels" USING btree ("parent_id");
  CREATE INDEX "_events_v_rels_path_idx" ON "_events_v_rels" USING btree ("path");
  CREATE INDEX "_events_v_rels_media_id_idx" ON "_events_v_rels" USING btree ("media_id");
  CREATE INDEX "_events_v_rels_admins_id_idx" ON "_events_v_rels" USING btree ("admins_id");
  CREATE INDEX "_events_v_rels_users_id_idx" ON "_events_v_rels" USING btree ("users_id");
  CREATE INDEX "ticket_types_perks_order_idx" ON "ticket_types_perks" USING btree ("_order");
  CREATE INDEX "ticket_types_perks_parent_id_idx" ON "ticket_types_perks" USING btree ("_parent_id");
  CREATE INDEX "ticket_types_event_idx" ON "ticket_types" USING btree ("event_id");
  CREATE INDEX "ticket_types_updated_at_idx" ON "ticket_types" USING btree ("updated_at");
  CREATE INDEX "ticket_types_created_at_idx" ON "ticket_types" USING btree ("created_at");
  CREATE INDEX "ticket_types_rels_order_idx" ON "ticket_types_rels" USING btree ("order");
  CREATE INDEX "ticket_types_rels_parent_idx" ON "ticket_types_rels" USING btree ("parent_id");
  CREATE INDEX "ticket_types_rels_path_idx" ON "ticket_types_rels" USING btree ("path");
  CREATE INDEX "ticket_types_rels_admins_id_idx" ON "ticket_types_rels" USING btree ("admins_id");
  CREATE INDEX "ticket_types_rels_users_id_idx" ON "ticket_types_rels" USING btree ("users_id");
  CREATE INDEX "_ticket_types_v_version_perks_order_idx" ON "_ticket_types_v_version_perks" USING btree ("_order");
  CREATE INDEX "_ticket_types_v_version_perks_parent_id_idx" ON "_ticket_types_v_version_perks" USING btree ("_parent_id");
  CREATE INDEX "_ticket_types_v_parent_idx" ON "_ticket_types_v" USING btree ("parent_id");
  CREATE INDEX "_ticket_types_v_version_version_event_idx" ON "_ticket_types_v" USING btree ("version_event_id");
  CREATE INDEX "_ticket_types_v_version_version_updated_at_idx" ON "_ticket_types_v" USING btree ("version_updated_at");
  CREATE INDEX "_ticket_types_v_version_version_created_at_idx" ON "_ticket_types_v" USING btree ("version_created_at");
  CREATE INDEX "_ticket_types_v_created_at_idx" ON "_ticket_types_v" USING btree ("created_at");
  CREATE INDEX "_ticket_types_v_updated_at_idx" ON "_ticket_types_v" USING btree ("updated_at");
  CREATE INDEX "_ticket_types_v_rels_order_idx" ON "_ticket_types_v_rels" USING btree ("order");
  CREATE INDEX "_ticket_types_v_rels_parent_idx" ON "_ticket_types_v_rels" USING btree ("parent_id");
  CREATE INDEX "_ticket_types_v_rels_path_idx" ON "_ticket_types_v_rels" USING btree ("path");
  CREATE INDEX "_ticket_types_v_rels_admins_id_idx" ON "_ticket_types_v_rels" USING btree ("admins_id");
  CREATE INDEX "_ticket_types_v_rels_users_id_idx" ON "_ticket_types_v_rels" USING btree ("users_id");
  CREATE UNIQUE INDEX "organizer_profiles_owner_idx" ON "organizer_profiles" USING btree ("owner_id");
  CREATE UNIQUE INDEX "organizer_profiles_slug_idx" ON "organizer_profiles" USING btree ("slug");
  CREATE INDEX "organizer_profiles_logo_idx" ON "organizer_profiles" USING btree ("logo_id");
  CREATE INDEX "organizer_profiles_updated_at_idx" ON "organizer_profiles" USING btree ("updated_at");
  CREATE INDEX "organizer_profiles_created_at_idx" ON "organizer_profiles" USING btree ("created_at");
  CREATE INDEX "organizer_profiles_rels_order_idx" ON "organizer_profiles_rels" USING btree ("order");
  CREATE INDEX "organizer_profiles_rels_parent_idx" ON "organizer_profiles_rels" USING btree ("parent_id");
  CREATE INDEX "organizer_profiles_rels_path_idx" ON "organizer_profiles_rels" USING btree ("path");
  CREATE INDEX "organizer_profiles_rels_admins_id_idx" ON "organizer_profiles_rels" USING btree ("admins_id");
  CREATE INDEX "organizer_profiles_rels_users_id_idx" ON "organizer_profiles_rels" USING btree ("users_id");
  CREATE INDEX "_organizer_profiles_v_parent_idx" ON "_organizer_profiles_v" USING btree ("parent_id");
  CREATE INDEX "_organizer_profiles_v_version_version_owner_idx" ON "_organizer_profiles_v" USING btree ("version_owner_id");
  CREATE INDEX "_organizer_profiles_v_version_version_slug_idx" ON "_organizer_profiles_v" USING btree ("version_slug");
  CREATE INDEX "_organizer_profiles_v_version_version_logo_idx" ON "_organizer_profiles_v" USING btree ("version_logo_id");
  CREATE INDEX "_organizer_profiles_v_version_version_updated_at_idx" ON "_organizer_profiles_v" USING btree ("version_updated_at");
  CREATE INDEX "_organizer_profiles_v_version_version_created_at_idx" ON "_organizer_profiles_v" USING btree ("version_created_at");
  CREATE INDEX "_organizer_profiles_v_created_at_idx" ON "_organizer_profiles_v" USING btree ("created_at");
  CREATE INDEX "_organizer_profiles_v_updated_at_idx" ON "_organizer_profiles_v" USING btree ("updated_at");
  CREATE INDEX "_organizer_profiles_v_rels_order_idx" ON "_organizer_profiles_v_rels" USING btree ("order");
  CREATE INDEX "_organizer_profiles_v_rels_parent_idx" ON "_organizer_profiles_v_rels" USING btree ("parent_id");
  CREATE INDEX "_organizer_profiles_v_rels_path_idx" ON "_organizer_profiles_v_rels" USING btree ("path");
  CREATE INDEX "_organizer_profiles_v_rels_admins_id_idx" ON "_organizer_profiles_v_rels" USING btree ("admins_id");
  CREATE INDEX "_organizer_profiles_v_rels_users_id_idx" ON "_organizer_profiles_v_rels" USING btree ("users_id");
  CREATE INDEX "discounts_organizer_idx" ON "discounts" USING btree ("organizer_id");
  CREATE INDEX "discounts_event_idx" ON "discounts" USING btree ("event_id");
  CREATE INDEX "discounts_code_idx" ON "discounts" USING btree ("code");
  CREATE INDEX "discounts_updated_at_idx" ON "discounts" USING btree ("updated_at");
  CREATE INDEX "discounts_created_at_idx" ON "discounts" USING btree ("created_at");
  CREATE INDEX "discounts_rels_order_idx" ON "discounts_rels" USING btree ("order");
  CREATE INDEX "discounts_rels_parent_idx" ON "discounts_rels" USING btree ("parent_id");
  CREATE INDEX "discounts_rels_path_idx" ON "discounts_rels" USING btree ("path");
  CREATE INDEX "discounts_rels_admins_id_idx" ON "discounts_rels" USING btree ("admins_id");
  CREATE INDEX "discounts_rels_users_id_idx" ON "discounts_rels" USING btree ("users_id");
  CREATE INDEX "_discounts_v_parent_idx" ON "_discounts_v" USING btree ("parent_id");
  CREATE INDEX "_discounts_v_version_version_organizer_idx" ON "_discounts_v" USING btree ("version_organizer_id");
  CREATE INDEX "_discounts_v_version_version_event_idx" ON "_discounts_v" USING btree ("version_event_id");
  CREATE INDEX "_discounts_v_version_version_code_idx" ON "_discounts_v" USING btree ("version_code");
  CREATE INDEX "_discounts_v_version_version_updated_at_idx" ON "_discounts_v" USING btree ("version_updated_at");
  CREATE INDEX "_discounts_v_version_version_created_at_idx" ON "_discounts_v" USING btree ("version_created_at");
  CREATE INDEX "_discounts_v_created_at_idx" ON "_discounts_v" USING btree ("created_at");
  CREATE INDEX "_discounts_v_updated_at_idx" ON "_discounts_v" USING btree ("updated_at");
  CREATE INDEX "_discounts_v_rels_order_idx" ON "_discounts_v_rels" USING btree ("order");
  CREATE INDEX "_discounts_v_rels_parent_idx" ON "_discounts_v_rels" USING btree ("parent_id");
  CREATE INDEX "_discounts_v_rels_path_idx" ON "_discounts_v_rels" USING btree ("path");
  CREATE INDEX "_discounts_v_rels_admins_id_idx" ON "_discounts_v_rels" USING btree ("admins_id");
  CREATE INDEX "_discounts_v_rels_users_id_idx" ON "_discounts_v_rels" USING btree ("users_id");
  CREATE INDEX "guest_list_entries_organizer_idx" ON "guest_list_entries" USING btree ("organizer_id");
  CREATE INDEX "guest_list_entries_event_idx" ON "guest_list_entries" USING btree ("event_id");
  CREATE INDEX "guest_list_entries_updated_at_idx" ON "guest_list_entries" USING btree ("updated_at");
  CREATE INDEX "guest_list_entries_created_at_idx" ON "guest_list_entries" USING btree ("created_at");
  CREATE INDEX "guest_list_entries_rels_order_idx" ON "guest_list_entries_rels" USING btree ("order");
  CREATE INDEX "guest_list_entries_rels_parent_idx" ON "guest_list_entries_rels" USING btree ("parent_id");
  CREATE INDEX "guest_list_entries_rels_path_idx" ON "guest_list_entries_rels" USING btree ("path");
  CREATE INDEX "guest_list_entries_rels_admins_id_idx" ON "guest_list_entries_rels" USING btree ("admins_id");
  CREATE INDEX "guest_list_entries_rels_users_id_idx" ON "guest_list_entries_rels" USING btree ("users_id");
  CREATE INDEX "_guest_list_entries_v_parent_idx" ON "_guest_list_entries_v" USING btree ("parent_id");
  CREATE INDEX "_guest_list_entries_v_version_version_organizer_idx" ON "_guest_list_entries_v" USING btree ("version_organizer_id");
  CREATE INDEX "_guest_list_entries_v_version_version_event_idx" ON "_guest_list_entries_v" USING btree ("version_event_id");
  CREATE INDEX "_guest_list_entries_v_version_version_updated_at_idx" ON "_guest_list_entries_v" USING btree ("version_updated_at");
  CREATE INDEX "_guest_list_entries_v_version_version_created_at_idx" ON "_guest_list_entries_v" USING btree ("version_created_at");
  CREATE INDEX "_guest_list_entries_v_created_at_idx" ON "_guest_list_entries_v" USING btree ("created_at");
  CREATE INDEX "_guest_list_entries_v_updated_at_idx" ON "_guest_list_entries_v" USING btree ("updated_at");
  CREATE INDEX "_guest_list_entries_v_rels_order_idx" ON "_guest_list_entries_v_rels" USING btree ("order");
  CREATE INDEX "_guest_list_entries_v_rels_parent_idx" ON "_guest_list_entries_v_rels" USING btree ("parent_id");
  CREATE INDEX "_guest_list_entries_v_rels_path_idx" ON "_guest_list_entries_v_rels" USING btree ("path");
  CREATE INDEX "_guest_list_entries_v_rels_admins_id_idx" ON "_guest_list_entries_v_rels" USING btree ("admins_id");
  CREATE INDEX "_guest_list_entries_v_rels_users_id_idx" ON "_guest_list_entries_v_rels" USING btree ("users_id");
  CREATE INDEX "announcements_organizer_idx" ON "announcements" USING btree ("organizer_id");
  CREATE INDEX "announcements_event_idx" ON "announcements" USING btree ("event_id");
  CREATE INDEX "announcements_updated_at_idx" ON "announcements" USING btree ("updated_at");
  CREATE INDEX "announcements_created_at_idx" ON "announcements" USING btree ("created_at");
  CREATE INDEX "announcements_rels_order_idx" ON "announcements_rels" USING btree ("order");
  CREATE INDEX "announcements_rels_parent_idx" ON "announcements_rels" USING btree ("parent_id");
  CREATE INDEX "announcements_rels_path_idx" ON "announcements_rels" USING btree ("path");
  CREATE INDEX "announcements_rels_admins_id_idx" ON "announcements_rels" USING btree ("admins_id");
  CREATE INDEX "announcements_rels_users_id_idx" ON "announcements_rels" USING btree ("users_id");
  CREATE INDEX "_announcements_v_parent_idx" ON "_announcements_v" USING btree ("parent_id");
  CREATE INDEX "_announcements_v_version_version_organizer_idx" ON "_announcements_v" USING btree ("version_organizer_id");
  CREATE INDEX "_announcements_v_version_version_event_idx" ON "_announcements_v" USING btree ("version_event_id");
  CREATE INDEX "_announcements_v_version_version_updated_at_idx" ON "_announcements_v" USING btree ("version_updated_at");
  CREATE INDEX "_announcements_v_version_version_created_at_idx" ON "_announcements_v" USING btree ("version_created_at");
  CREATE INDEX "_announcements_v_created_at_idx" ON "_announcements_v" USING btree ("created_at");
  CREATE INDEX "_announcements_v_updated_at_idx" ON "_announcements_v" USING btree ("updated_at");
  CREATE INDEX "_announcements_v_rels_order_idx" ON "_announcements_v_rels" USING btree ("order");
  CREATE INDEX "_announcements_v_rels_parent_idx" ON "_announcements_v_rels" USING btree ("parent_id");
  CREATE INDEX "_announcements_v_rels_path_idx" ON "_announcements_v_rels" USING btree ("path");
  CREATE INDEX "_announcements_v_rels_admins_id_idx" ON "_announcements_v_rels" USING btree ("admins_id");
  CREATE INDEX "_announcements_v_rels_users_id_idx" ON "_announcements_v_rels" USING btree ("users_id");
  CREATE INDEX "event_collections_organizer_idx" ON "event_collections" USING btree ("organizer_id");
  CREATE INDEX "event_collections_updated_at_idx" ON "event_collections" USING btree ("updated_at");
  CREATE INDEX "event_collections_created_at_idx" ON "event_collections" USING btree ("created_at");
  CREATE INDEX "event_collections_rels_order_idx" ON "event_collections_rels" USING btree ("order");
  CREATE INDEX "event_collections_rels_parent_idx" ON "event_collections_rels" USING btree ("parent_id");
  CREATE INDEX "event_collections_rels_path_idx" ON "event_collections_rels" USING btree ("path");
  CREATE INDEX "event_collections_rels_events_id_idx" ON "event_collections_rels" USING btree ("events_id");
  CREATE INDEX "event_collections_rels_admins_id_idx" ON "event_collections_rels" USING btree ("admins_id");
  CREATE INDEX "event_collections_rels_users_id_idx" ON "event_collections_rels" USING btree ("users_id");
  CREATE INDEX "_event_collections_v_parent_idx" ON "_event_collections_v" USING btree ("parent_id");
  CREATE INDEX "_event_collections_v_version_version_organizer_idx" ON "_event_collections_v" USING btree ("version_organizer_id");
  CREATE INDEX "_event_collections_v_version_version_updated_at_idx" ON "_event_collections_v" USING btree ("version_updated_at");
  CREATE INDEX "_event_collections_v_version_version_created_at_idx" ON "_event_collections_v" USING btree ("version_created_at");
  CREATE INDEX "_event_collections_v_created_at_idx" ON "_event_collections_v" USING btree ("created_at");
  CREATE INDEX "_event_collections_v_updated_at_idx" ON "_event_collections_v" USING btree ("updated_at");
  CREATE INDEX "_event_collections_v_rels_order_idx" ON "_event_collections_v_rels" USING btree ("order");
  CREATE INDEX "_event_collections_v_rels_parent_idx" ON "_event_collections_v_rels" USING btree ("parent_id");
  CREATE INDEX "_event_collections_v_rels_path_idx" ON "_event_collections_v_rels" USING btree ("path");
  CREATE INDEX "_event_collections_v_rels_events_id_idx" ON "_event_collections_v_rels" USING btree ("events_id");
  CREATE INDEX "_event_collections_v_rels_admins_id_idx" ON "_event_collections_v_rels" USING btree ("admins_id");
  CREATE INDEX "_event_collections_v_rels_users_id_idx" ON "_event_collections_v_rels" USING btree ("users_id");
  CREATE UNIQUE INDEX "bank_verifications_organizer_idx" ON "bank_verifications" USING btree ("organizer_id");
  CREATE INDEX "bank_verifications_updated_at_idx" ON "bank_verifications" USING btree ("updated_at");
  CREATE INDEX "bank_verifications_created_at_idx" ON "bank_verifications" USING btree ("created_at");
  CREATE INDEX "bank_verifications_rels_order_idx" ON "bank_verifications_rels" USING btree ("order");
  CREATE INDEX "bank_verifications_rels_parent_idx" ON "bank_verifications_rels" USING btree ("parent_id");
  CREATE INDEX "bank_verifications_rels_path_idx" ON "bank_verifications_rels" USING btree ("path");
  CREATE INDEX "bank_verifications_rels_admins_id_idx" ON "bank_verifications_rels" USING btree ("admins_id");
  CREATE INDEX "bank_verifications_rels_users_id_idx" ON "bank_verifications_rels" USING btree ("users_id");
  CREATE INDEX "_bank_verifications_v_parent_idx" ON "_bank_verifications_v" USING btree ("parent_id");
  CREATE INDEX "_bank_verifications_v_version_version_organizer_idx" ON "_bank_verifications_v" USING btree ("version_organizer_id");
  CREATE INDEX "_bank_verifications_v_version_version_updated_at_idx" ON "_bank_verifications_v" USING btree ("version_updated_at");
  CREATE INDEX "_bank_verifications_v_version_version_created_at_idx" ON "_bank_verifications_v" USING btree ("version_created_at");
  CREATE INDEX "_bank_verifications_v_created_at_idx" ON "_bank_verifications_v" USING btree ("created_at");
  CREATE INDEX "_bank_verifications_v_updated_at_idx" ON "_bank_verifications_v" USING btree ("updated_at");
  CREATE INDEX "_bank_verifications_v_rels_order_idx" ON "_bank_verifications_v_rels" USING btree ("order");
  CREATE INDEX "_bank_verifications_v_rels_parent_idx" ON "_bank_verifications_v_rels" USING btree ("parent_id");
  CREATE INDEX "_bank_verifications_v_rels_path_idx" ON "_bank_verifications_v_rels" USING btree ("path");
  CREATE INDEX "_bank_verifications_v_rels_admins_id_idx" ON "_bank_verifications_v_rels" USING btree ("admins_id");
  CREATE INDEX "_bank_verifications_v_rels_users_id_idx" ON "_bank_verifications_v_rels" USING btree ("users_id");
  CREATE INDEX "bank_change_appeals_audit_history_order_idx" ON "bank_change_appeals_audit_history" USING btree ("_order");
  CREATE INDEX "bank_change_appeals_audit_history_parent_id_idx" ON "bank_change_appeals_audit_history" USING btree ("_parent_id");
  CREATE INDEX "bank_change_appeals_organizer_idx" ON "bank_change_appeals" USING btree ("organizer_id");
  CREATE INDEX "bank_change_appeals_status_idx" ON "bank_change_appeals" USING btree ("status");
  CREATE INDEX "bank_change_appeals_reviewed_by_idx" ON "bank_change_appeals" USING btree ("reviewed_by_id");
  CREATE INDEX "bank_change_appeals_overridden_by_idx" ON "bank_change_appeals" USING btree ("overridden_by_id");
  CREATE INDEX "bank_change_appeals_updated_at_idx" ON "bank_change_appeals" USING btree ("updated_at");
  CREATE INDEX "bank_change_appeals_created_at_idx" ON "bank_change_appeals" USING btree ("created_at");
  CREATE INDEX "bank_change_appeals_rels_order_idx" ON "bank_change_appeals_rels" USING btree ("order");
  CREATE INDEX "bank_change_appeals_rels_parent_idx" ON "bank_change_appeals_rels" USING btree ("parent_id");
  CREATE INDEX "bank_change_appeals_rels_path_idx" ON "bank_change_appeals_rels" USING btree ("path");
  CREATE INDEX "bank_change_appeals_rels_admins_id_idx" ON "bank_change_appeals_rels" USING btree ("admins_id");
  CREATE INDEX "bank_change_appeals_rels_users_id_idx" ON "bank_change_appeals_rels" USING btree ("users_id");
  CREATE INDEX "_bank_change_appeals_v_version_audit_history_order_idx" ON "_bank_change_appeals_v_version_audit_history" USING btree ("_order");
  CREATE INDEX "_bank_change_appeals_v_version_audit_history_parent_id_idx" ON "_bank_change_appeals_v_version_audit_history" USING btree ("_parent_id");
  CREATE INDEX "_bank_change_appeals_v_parent_idx" ON "_bank_change_appeals_v" USING btree ("parent_id");
  CREATE INDEX "_bank_change_appeals_v_version_version_organizer_idx" ON "_bank_change_appeals_v" USING btree ("version_organizer_id");
  CREATE INDEX "_bank_change_appeals_v_version_version_status_idx" ON "_bank_change_appeals_v" USING btree ("version_status");
  CREATE INDEX "_bank_change_appeals_v_version_version_reviewed_by_idx" ON "_bank_change_appeals_v" USING btree ("version_reviewed_by_id");
  CREATE INDEX "_bank_change_appeals_v_version_version_overridden_by_idx" ON "_bank_change_appeals_v" USING btree ("version_overridden_by_id");
  CREATE INDEX "_bank_change_appeals_v_version_version_updated_at_idx" ON "_bank_change_appeals_v" USING btree ("version_updated_at");
  CREATE INDEX "_bank_change_appeals_v_version_version_created_at_idx" ON "_bank_change_appeals_v" USING btree ("version_created_at");
  CREATE INDEX "_bank_change_appeals_v_created_at_idx" ON "_bank_change_appeals_v" USING btree ("created_at");
  CREATE INDEX "_bank_change_appeals_v_updated_at_idx" ON "_bank_change_appeals_v" USING btree ("updated_at");
  CREATE INDEX "_bank_change_appeals_v_rels_order_idx" ON "_bank_change_appeals_v_rels" USING btree ("order");
  CREATE INDEX "_bank_change_appeals_v_rels_parent_idx" ON "_bank_change_appeals_v_rels" USING btree ("parent_id");
  CREATE INDEX "_bank_change_appeals_v_rels_path_idx" ON "_bank_change_appeals_v_rels" USING btree ("path");
  CREATE INDEX "_bank_change_appeals_v_rels_admins_id_idx" ON "_bank_change_appeals_v_rels" USING btree ("admins_id");
  CREATE INDEX "_bank_change_appeals_v_rels_users_id_idx" ON "_bank_change_appeals_v_rels" USING btree ("users_id");
  CREATE UNIQUE INDEX "free_ticket_links_code_idx" ON "free_ticket_links" USING btree ("code");
  CREATE INDEX "free_ticket_links_event_idx" ON "free_ticket_links" USING btree ("event_id");
  CREATE INDEX "free_ticket_links_ticket_type_idx" ON "free_ticket_links" USING btree ("ticket_type_id");
  CREATE INDEX "free_ticket_links_organizer_idx" ON "free_ticket_links" USING btree ("organizer_id");
  CREATE INDEX "free_ticket_links_status_idx" ON "free_ticket_links" USING btree ("status");
  CREATE INDEX "free_ticket_links_ticket_idx" ON "free_ticket_links" USING btree ("ticket_id");
  CREATE INDEX "free_ticket_links_updated_at_idx" ON "free_ticket_links" USING btree ("updated_at");
  CREATE INDEX "free_ticket_links_created_at_idx" ON "free_ticket_links" USING btree ("created_at");
  CREATE INDEX "free_ticket_links_rels_order_idx" ON "free_ticket_links_rels" USING btree ("order");
  CREATE INDEX "free_ticket_links_rels_parent_idx" ON "free_ticket_links_rels" USING btree ("parent_id");
  CREATE INDEX "free_ticket_links_rels_path_idx" ON "free_ticket_links_rels" USING btree ("path");
  CREATE INDEX "free_ticket_links_rels_admins_id_idx" ON "free_ticket_links_rels" USING btree ("admins_id");
  CREATE INDEX "free_ticket_links_rels_users_id_idx" ON "free_ticket_links_rels" USING btree ("users_id");
  CREATE INDEX "_free_ticket_links_v_parent_idx" ON "_free_ticket_links_v" USING btree ("parent_id");
  CREATE INDEX "_free_ticket_links_v_version_version_code_idx" ON "_free_ticket_links_v" USING btree ("version_code");
  CREATE INDEX "_free_ticket_links_v_version_version_event_idx" ON "_free_ticket_links_v" USING btree ("version_event_id");
  CREATE INDEX "_free_ticket_links_v_version_version_ticket_type_idx" ON "_free_ticket_links_v" USING btree ("version_ticket_type_id");
  CREATE INDEX "_free_ticket_links_v_version_version_organizer_idx" ON "_free_ticket_links_v" USING btree ("version_organizer_id");
  CREATE INDEX "_free_ticket_links_v_version_version_status_idx" ON "_free_ticket_links_v" USING btree ("version_status");
  CREATE INDEX "_free_ticket_links_v_version_version_ticket_idx" ON "_free_ticket_links_v" USING btree ("version_ticket_id");
  CREATE INDEX "_free_ticket_links_v_version_version_updated_at_idx" ON "_free_ticket_links_v" USING btree ("version_updated_at");
  CREATE INDEX "_free_ticket_links_v_version_version_created_at_idx" ON "_free_ticket_links_v" USING btree ("version_created_at");
  CREATE INDEX "_free_ticket_links_v_created_at_idx" ON "_free_ticket_links_v" USING btree ("created_at");
  CREATE INDEX "_free_ticket_links_v_updated_at_idx" ON "_free_ticket_links_v" USING btree ("updated_at");
  CREATE INDEX "_free_ticket_links_v_rels_order_idx" ON "_free_ticket_links_v_rels" USING btree ("order");
  CREATE INDEX "_free_ticket_links_v_rels_parent_idx" ON "_free_ticket_links_v_rels" USING btree ("parent_id");
  CREATE INDEX "_free_ticket_links_v_rels_path_idx" ON "_free_ticket_links_v_rels" USING btree ("path");
  CREATE INDEX "_free_ticket_links_v_rels_admins_id_idx" ON "_free_ticket_links_v_rels" USING btree ("admins_id");
  CREATE INDEX "_free_ticket_links_v_rels_users_id_idx" ON "_free_ticket_links_v_rels" USING btree ("users_id");
  CREATE INDEX "orders_items_order_idx" ON "orders_items" USING btree ("_order");
  CREATE INDEX "orders_items_parent_id_idx" ON "orders_items" USING btree ("_parent_id");
  CREATE INDEX "orders_items_ticket_type_idx" ON "orders_items" USING btree ("ticket_type_id");
  CREATE INDEX "orders_attendee_answers_order_idx" ON "orders_attendee_answers" USING btree ("_order");
  CREATE INDEX "orders_attendee_answers_parent_id_idx" ON "orders_attendee_answers" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "orders_reference_idx" ON "orders" USING btree ("reference");
  CREATE INDEX "orders_event_idx" ON "orders" USING btree ("event_id");
  CREATE INDEX "orders_customer_customer_email_idx" ON "orders" USING btree ("customer_email");
  CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  CREATE INDEX "orders_rels_order_idx" ON "orders_rels" USING btree ("order");
  CREATE INDEX "orders_rels_parent_idx" ON "orders_rels" USING btree ("parent_id");
  CREATE INDEX "orders_rels_path_idx" ON "orders_rels" USING btree ("path");
  CREATE INDEX "orders_rels_admins_id_idx" ON "orders_rels" USING btree ("admins_id");
  CREATE INDEX "orders_rels_users_id_idx" ON "orders_rels" USING btree ("users_id");
  CREATE INDEX "_orders_v_version_items_order_idx" ON "_orders_v_version_items" USING btree ("_order");
  CREATE INDEX "_orders_v_version_items_parent_id_idx" ON "_orders_v_version_items" USING btree ("_parent_id");
  CREATE INDEX "_orders_v_version_items_ticket_type_idx" ON "_orders_v_version_items" USING btree ("ticket_type_id");
  CREATE INDEX "_orders_v_version_attendee_answers_order_idx" ON "_orders_v_version_attendee_answers" USING btree ("_order");
  CREATE INDEX "_orders_v_version_attendee_answers_parent_id_idx" ON "_orders_v_version_attendee_answers" USING btree ("_parent_id");
  CREATE INDEX "_orders_v_parent_idx" ON "_orders_v" USING btree ("parent_id");
  CREATE INDEX "_orders_v_version_version_reference_idx" ON "_orders_v" USING btree ("version_reference");
  CREATE INDEX "_orders_v_version_version_event_idx" ON "_orders_v" USING btree ("version_event_id");
  CREATE INDEX "_orders_v_version_customer_version_customer_email_idx" ON "_orders_v" USING btree ("version_customer_email");
  CREATE INDEX "_orders_v_version_version_status_idx" ON "_orders_v" USING btree ("version_status");
  CREATE INDEX "_orders_v_version_version_updated_at_idx" ON "_orders_v" USING btree ("version_updated_at");
  CREATE INDEX "_orders_v_version_version_created_at_idx" ON "_orders_v" USING btree ("version_created_at");
  CREATE INDEX "_orders_v_created_at_idx" ON "_orders_v" USING btree ("created_at");
  CREATE INDEX "_orders_v_updated_at_idx" ON "_orders_v" USING btree ("updated_at");
  CREATE INDEX "_orders_v_rels_order_idx" ON "_orders_v_rels" USING btree ("order");
  CREATE INDEX "_orders_v_rels_parent_idx" ON "_orders_v_rels" USING btree ("parent_id");
  CREATE INDEX "_orders_v_rels_path_idx" ON "_orders_v_rels" USING btree ("path");
  CREATE INDEX "_orders_v_rels_admins_id_idx" ON "_orders_v_rels" USING btree ("admins_id");
  CREATE INDEX "_orders_v_rels_users_id_idx" ON "_orders_v_rels" USING btree ("users_id");
  CREATE INDEX "transactions_order_idx" ON "transactions" USING btree ("order_id");
  CREATE INDEX "transactions_event_idx" ON "transactions" USING btree ("event_id");
  CREATE UNIQUE INDEX "transactions_provider_reference_idx" ON "transactions" USING btree ("provider_reference");
  CREATE INDEX "transactions_updated_at_idx" ON "transactions" USING btree ("updated_at");
  CREATE INDEX "transactions_created_at_idx" ON "transactions" USING btree ("created_at");
  CREATE INDEX "transactions_rels_order_idx" ON "transactions_rels" USING btree ("order");
  CREATE INDEX "transactions_rels_parent_idx" ON "transactions_rels" USING btree ("parent_id");
  CREATE INDEX "transactions_rels_path_idx" ON "transactions_rels" USING btree ("path");
  CREATE INDEX "transactions_rels_admins_id_idx" ON "transactions_rels" USING btree ("admins_id");
  CREATE INDEX "transactions_rels_users_id_idx" ON "transactions_rels" USING btree ("users_id");
  CREATE INDEX "_transactions_v_parent_idx" ON "_transactions_v" USING btree ("parent_id");
  CREATE INDEX "_transactions_v_version_version_order_idx" ON "_transactions_v" USING btree ("version_order_id");
  CREATE INDEX "_transactions_v_version_version_event_idx" ON "_transactions_v" USING btree ("version_event_id");
  CREATE INDEX "_transactions_v_version_version_provider_reference_idx" ON "_transactions_v" USING btree ("version_provider_reference");
  CREATE INDEX "_transactions_v_version_version_updated_at_idx" ON "_transactions_v" USING btree ("version_updated_at");
  CREATE INDEX "_transactions_v_version_version_created_at_idx" ON "_transactions_v" USING btree ("version_created_at");
  CREATE INDEX "_transactions_v_created_at_idx" ON "_transactions_v" USING btree ("created_at");
  CREATE INDEX "_transactions_v_updated_at_idx" ON "_transactions_v" USING btree ("updated_at");
  CREATE INDEX "_transactions_v_rels_order_idx" ON "_transactions_v_rels" USING btree ("order");
  CREATE INDEX "_transactions_v_rels_parent_idx" ON "_transactions_v_rels" USING btree ("parent_id");
  CREATE INDEX "_transactions_v_rels_path_idx" ON "_transactions_v_rels" USING btree ("path");
  CREATE INDEX "_transactions_v_rels_admins_id_idx" ON "_transactions_v_rels" USING btree ("admins_id");
  CREATE INDEX "_transactions_v_rels_users_id_idx" ON "_transactions_v_rels" USING btree ("users_id");
  CREATE UNIQUE INDEX "tickets_code_idx" ON "tickets" USING btree ("code");
  CREATE UNIQUE INDEX "tickets_issuance_key_idx" ON "tickets" USING btree ("issuance_key");
  CREATE INDEX "tickets_order_idx" ON "tickets" USING btree ("order_id");
  CREATE INDEX "tickets_event_idx" ON "tickets" USING btree ("event_id");
  CREATE INDEX "tickets_ticket_type_idx" ON "tickets" USING btree ("ticket_type_id");
  CREATE INDEX "tickets_attendee_email_idx" ON "tickets" USING btree ("attendee_email");
  CREATE INDEX "tickets_checked_in_by_idx" ON "tickets" USING btree ("checked_in_by_id");
  CREATE INDEX "tickets_updated_at_idx" ON "tickets" USING btree ("updated_at");
  CREATE INDEX "tickets_created_at_idx" ON "tickets" USING btree ("created_at");
  CREATE INDEX "tickets_rels_order_idx" ON "tickets_rels" USING btree ("order");
  CREATE INDEX "tickets_rels_parent_idx" ON "tickets_rels" USING btree ("parent_id");
  CREATE INDEX "tickets_rels_path_idx" ON "tickets_rels" USING btree ("path");
  CREATE INDEX "tickets_rels_admins_id_idx" ON "tickets_rels" USING btree ("admins_id");
  CREATE INDEX "tickets_rels_users_id_idx" ON "tickets_rels" USING btree ("users_id");
  CREATE INDEX "_tickets_v_parent_idx" ON "_tickets_v" USING btree ("parent_id");
  CREATE INDEX "_tickets_v_version_version_code_idx" ON "_tickets_v" USING btree ("version_code");
  CREATE INDEX "_tickets_v_version_version_issuance_key_idx" ON "_tickets_v" USING btree ("version_issuance_key");
  CREATE INDEX "_tickets_v_version_version_order_idx" ON "_tickets_v" USING btree ("version_order_id");
  CREATE INDEX "_tickets_v_version_version_event_idx" ON "_tickets_v" USING btree ("version_event_id");
  CREATE INDEX "_tickets_v_version_version_ticket_type_idx" ON "_tickets_v" USING btree ("version_ticket_type_id");
  CREATE INDEX "_tickets_v_version_version_attendee_email_idx" ON "_tickets_v" USING btree ("version_attendee_email");
  CREATE INDEX "_tickets_v_version_version_checked_in_by_idx" ON "_tickets_v" USING btree ("version_checked_in_by_id");
  CREATE INDEX "_tickets_v_version_version_updated_at_idx" ON "_tickets_v" USING btree ("version_updated_at");
  CREATE INDEX "_tickets_v_version_version_created_at_idx" ON "_tickets_v" USING btree ("version_created_at");
  CREATE INDEX "_tickets_v_created_at_idx" ON "_tickets_v" USING btree ("created_at");
  CREATE INDEX "_tickets_v_updated_at_idx" ON "_tickets_v" USING btree ("updated_at");
  CREATE INDEX "_tickets_v_rels_order_idx" ON "_tickets_v_rels" USING btree ("order");
  CREATE INDEX "_tickets_v_rels_parent_idx" ON "_tickets_v_rels" USING btree ("parent_id");
  CREATE INDEX "_tickets_v_rels_path_idx" ON "_tickets_v_rels" USING btree ("path");
  CREATE INDEX "_tickets_v_rels_admins_id_idx" ON "_tickets_v_rels" USING btree ("admins_id");
  CREATE INDEX "_tickets_v_rels_users_id_idx" ON "_tickets_v_rels" USING btree ("users_id");
  CREATE INDEX "team_memberships_permissions_order_idx" ON "team_memberships_permissions" USING btree ("order");
  CREATE INDEX "team_memberships_permissions_parent_idx" ON "team_memberships_permissions" USING btree ("parent_id");
  CREATE INDEX "team_memberships_organizer_idx" ON "team_memberships" USING btree ("organizer_id");
  CREATE INDEX "team_memberships_updated_at_idx" ON "team_memberships" USING btree ("updated_at");
  CREATE INDEX "team_memberships_created_at_idx" ON "team_memberships" USING btree ("created_at");
  CREATE INDEX "team_memberships_rels_order_idx" ON "team_memberships_rels" USING btree ("order");
  CREATE INDEX "team_memberships_rels_parent_idx" ON "team_memberships_rels" USING btree ("parent_id");
  CREATE INDEX "team_memberships_rels_path_idx" ON "team_memberships_rels" USING btree ("path");
  CREATE INDEX "team_memberships_rels_admins_id_idx" ON "team_memberships_rels" USING btree ("admins_id");
  CREATE INDEX "team_memberships_rels_users_id_idx" ON "team_memberships_rels" USING btree ("users_id");
  CREATE INDEX "_team_memberships_v_version_permissions_order_idx" ON "_team_memberships_v_version_permissions" USING btree ("order");
  CREATE INDEX "_team_memberships_v_version_permissions_parent_idx" ON "_team_memberships_v_version_permissions" USING btree ("parent_id");
  CREATE INDEX "_team_memberships_v_parent_idx" ON "_team_memberships_v" USING btree ("parent_id");
  CREATE INDEX "_team_memberships_v_version_version_organizer_idx" ON "_team_memberships_v" USING btree ("version_organizer_id");
  CREATE INDEX "_team_memberships_v_version_version_updated_at_idx" ON "_team_memberships_v" USING btree ("version_updated_at");
  CREATE INDEX "_team_memberships_v_version_version_created_at_idx" ON "_team_memberships_v" USING btree ("version_created_at");
  CREATE INDEX "_team_memberships_v_created_at_idx" ON "_team_memberships_v" USING btree ("created_at");
  CREATE INDEX "_team_memberships_v_updated_at_idx" ON "_team_memberships_v" USING btree ("updated_at");
  CREATE INDEX "_team_memberships_v_rels_order_idx" ON "_team_memberships_v_rels" USING btree ("order");
  CREATE INDEX "_team_memberships_v_rels_parent_idx" ON "_team_memberships_v_rels" USING btree ("parent_id");
  CREATE INDEX "_team_memberships_v_rels_path_idx" ON "_team_memberships_v_rels" USING btree ("path");
  CREATE INDEX "_team_memberships_v_rels_admins_id_idx" ON "_team_memberships_v_rels" USING btree ("admins_id");
  CREATE INDEX "_team_memberships_v_rels_users_id_idx" ON "_team_memberships_v_rels" USING btree ("users_id");
  CREATE UNIQUE INDEX "payout_requests_reference_idx" ON "payout_requests" USING btree ("reference");
  CREATE UNIQUE INDEX "payout_requests_idempotency_key_idx" ON "payout_requests" USING btree ("idempotency_key");
  CREATE INDEX "payout_requests_organizer_idx" ON "payout_requests" USING btree ("organizer_id");
  CREATE INDEX "payout_requests_event_idx" ON "payout_requests" USING btree ("event_id");
  CREATE INDEX "payout_requests_status_idx" ON "payout_requests" USING btree ("status");
  CREATE INDEX "payout_requests_initiated_by_idx" ON "payout_requests" USING btree ("initiated_by_id");
  CREATE INDEX "payout_requests_reviewed_by_idx" ON "payout_requests" USING btree ("reviewed_by_id");
  CREATE INDEX "payout_requests_paystack_transfer_reference_idx" ON "payout_requests" USING btree ("paystack_transfer_reference");
  CREATE INDEX "payout_requests_updated_at_idx" ON "payout_requests" USING btree ("updated_at");
  CREATE INDEX "payout_requests_created_at_idx" ON "payout_requests" USING btree ("created_at");
  CREATE INDEX "payout_requests_rels_order_idx" ON "payout_requests_rels" USING btree ("order");
  CREATE INDEX "payout_requests_rels_parent_idx" ON "payout_requests_rels" USING btree ("parent_id");
  CREATE INDEX "payout_requests_rels_path_idx" ON "payout_requests_rels" USING btree ("path");
  CREATE INDEX "payout_requests_rels_admins_id_idx" ON "payout_requests_rels" USING btree ("admins_id");
  CREATE INDEX "payout_requests_rels_users_id_idx" ON "payout_requests_rels" USING btree ("users_id");
  CREATE INDEX "_payout_requests_v_parent_idx" ON "_payout_requests_v" USING btree ("parent_id");
  CREATE INDEX "_payout_requests_v_version_version_reference_idx" ON "_payout_requests_v" USING btree ("version_reference");
  CREATE INDEX "_payout_requests_v_version_version_idempotency_key_idx" ON "_payout_requests_v" USING btree ("version_idempotency_key");
  CREATE INDEX "_payout_requests_v_version_version_organizer_idx" ON "_payout_requests_v" USING btree ("version_organizer_id");
  CREATE INDEX "_payout_requests_v_version_version_event_idx" ON "_payout_requests_v" USING btree ("version_event_id");
  CREATE INDEX "_payout_requests_v_version_version_status_idx" ON "_payout_requests_v" USING btree ("version_status");
  CREATE INDEX "_payout_requests_v_version_version_initiated_by_idx" ON "_payout_requests_v" USING btree ("version_initiated_by_id");
  CREATE INDEX "_payout_requests_v_version_version_reviewed_by_idx" ON "_payout_requests_v" USING btree ("version_reviewed_by_id");
  CREATE INDEX "_payout_requests_v_version_version_paystack_transfer_ref_idx" ON "_payout_requests_v" USING btree ("version_paystack_transfer_reference");
  CREATE INDEX "_payout_requests_v_version_version_updated_at_idx" ON "_payout_requests_v" USING btree ("version_updated_at");
  CREATE INDEX "_payout_requests_v_version_version_created_at_idx" ON "_payout_requests_v" USING btree ("version_created_at");
  CREATE INDEX "_payout_requests_v_created_at_idx" ON "_payout_requests_v" USING btree ("created_at");
  CREATE INDEX "_payout_requests_v_updated_at_idx" ON "_payout_requests_v" USING btree ("updated_at");
  CREATE INDEX "_payout_requests_v_rels_order_idx" ON "_payout_requests_v_rels" USING btree ("order");
  CREATE INDEX "_payout_requests_v_rels_parent_idx" ON "_payout_requests_v_rels" USING btree ("parent_id");
  CREATE INDEX "_payout_requests_v_rels_path_idx" ON "_payout_requests_v_rels" USING btree ("path");
  CREATE INDEX "_payout_requests_v_rels_admins_id_idx" ON "_payout_requests_v_rels" USING btree ("admins_id");
  CREATE INDEX "_payout_requests_v_rels_users_id_idx" ON "_payout_requests_v_rels" USING btree ("users_id");
  CREATE UNIQUE INDEX "refunds_reference_idx" ON "refunds" USING btree ("reference");
  CREATE INDEX "refunds_order_idx" ON "refunds" USING btree ("order_id");
  CREATE INDEX "refunds_event_idx" ON "refunds" USING btree ("event_id");
  CREATE INDEX "refunds_initiated_by_idx" ON "refunds" USING btree ("initiated_by_id");
  CREATE INDEX "refunds_updated_at_idx" ON "refunds" USING btree ("updated_at");
  CREATE INDEX "refunds_created_at_idx" ON "refunds" USING btree ("created_at");
  CREATE INDEX "refunds_rels_order_idx" ON "refunds_rels" USING btree ("order");
  CREATE INDEX "refunds_rels_parent_idx" ON "refunds_rels" USING btree ("parent_id");
  CREATE INDEX "refunds_rels_path_idx" ON "refunds_rels" USING btree ("path");
  CREATE INDEX "refunds_rels_admins_id_idx" ON "refunds_rels" USING btree ("admins_id");
  CREATE INDEX "refunds_rels_users_id_idx" ON "refunds_rels" USING btree ("users_id");
  CREATE INDEX "_refunds_v_parent_idx" ON "_refunds_v" USING btree ("parent_id");
  CREATE INDEX "_refunds_v_version_version_reference_idx" ON "_refunds_v" USING btree ("version_reference");
  CREATE INDEX "_refunds_v_version_version_order_idx" ON "_refunds_v" USING btree ("version_order_id");
  CREATE INDEX "_refunds_v_version_version_event_idx" ON "_refunds_v" USING btree ("version_event_id");
  CREATE INDEX "_refunds_v_version_version_initiated_by_idx" ON "_refunds_v" USING btree ("version_initiated_by_id");
  CREATE INDEX "_refunds_v_version_version_updated_at_idx" ON "_refunds_v" USING btree ("version_updated_at");
  CREATE INDEX "_refunds_v_version_version_created_at_idx" ON "_refunds_v" USING btree ("version_created_at");
  CREATE INDEX "_refunds_v_created_at_idx" ON "_refunds_v" USING btree ("created_at");
  CREATE INDEX "_refunds_v_updated_at_idx" ON "_refunds_v" USING btree ("updated_at");
  CREATE INDEX "_refunds_v_rels_order_idx" ON "_refunds_v_rels" USING btree ("order");
  CREATE INDEX "_refunds_v_rels_parent_idx" ON "_refunds_v_rels" USING btree ("parent_id");
  CREATE INDEX "_refunds_v_rels_path_idx" ON "_refunds_v_rels" USING btree ("path");
  CREATE INDEX "_refunds_v_rels_admins_id_idx" ON "_refunds_v_rels" USING btree ("admins_id");
  CREATE INDEX "_refunds_v_rels_users_id_idx" ON "_refunds_v_rels" USING btree ("users_id");
  CREATE INDEX "complaints_updated_at_idx" ON "complaints" USING btree ("updated_at");
  CREATE INDEX "complaints_created_at_idx" ON "complaints" USING btree ("created_at");
  CREATE INDEX "complaints_rels_order_idx" ON "complaints_rels" USING btree ("order");
  CREATE INDEX "complaints_rels_parent_idx" ON "complaints_rels" USING btree ("parent_id");
  CREATE INDEX "complaints_rels_path_idx" ON "complaints_rels" USING btree ("path");
  CREATE INDEX "complaints_rels_admins_id_idx" ON "complaints_rels" USING btree ("admins_id");
  CREATE INDEX "complaints_rels_users_id_idx" ON "complaints_rels" USING btree ("users_id");
  CREATE INDEX "_complaints_v_parent_idx" ON "_complaints_v" USING btree ("parent_id");
  CREATE INDEX "_complaints_v_version_version_updated_at_idx" ON "_complaints_v" USING btree ("version_updated_at");
  CREATE INDEX "_complaints_v_version_version_created_at_idx" ON "_complaints_v" USING btree ("version_created_at");
  CREATE INDEX "_complaints_v_created_at_idx" ON "_complaints_v" USING btree ("created_at");
  CREATE INDEX "_complaints_v_updated_at_idx" ON "_complaints_v" USING btree ("updated_at");
  CREATE INDEX "_complaints_v_rels_order_idx" ON "_complaints_v_rels" USING btree ("order");
  CREATE INDEX "_complaints_v_rels_parent_idx" ON "_complaints_v_rels" USING btree ("parent_id");
  CREATE INDEX "_complaints_v_rels_path_idx" ON "_complaints_v_rels" USING btree ("path");
  CREATE INDEX "_complaints_v_rels_admins_id_idx" ON "_complaints_v_rels" USING btree ("admins_id");
  CREATE INDEX "_complaints_v_rels_users_id_idx" ON "_complaints_v_rels" USING btree ("users_id");
  CREATE UNIQUE INDEX "subscribers_email_idx" ON "subscribers" USING btree ("email");
  CREATE INDEX "subscribers_updated_at_idx" ON "subscribers" USING btree ("updated_at");
  CREATE INDEX "subscribers_created_at_idx" ON "subscribers" USING btree ("created_at");
  CREATE INDEX "subscribers_rels_order_idx" ON "subscribers_rels" USING btree ("order");
  CREATE INDEX "subscribers_rels_parent_idx" ON "subscribers_rels" USING btree ("parent_id");
  CREATE INDEX "subscribers_rels_path_idx" ON "subscribers_rels" USING btree ("path");
  CREATE INDEX "subscribers_rels_admins_id_idx" ON "subscribers_rels" USING btree ("admins_id");
  CREATE INDEX "subscribers_rels_users_id_idx" ON "subscribers_rels" USING btree ("users_id");
  CREATE INDEX "_subscribers_v_parent_idx" ON "_subscribers_v" USING btree ("parent_id");
  CREATE INDEX "_subscribers_v_version_version_email_idx" ON "_subscribers_v" USING btree ("version_email");
  CREATE INDEX "_subscribers_v_version_version_updated_at_idx" ON "_subscribers_v" USING btree ("version_updated_at");
  CREATE INDEX "_subscribers_v_version_version_created_at_idx" ON "_subscribers_v" USING btree ("version_created_at");
  CREATE INDEX "_subscribers_v_created_at_idx" ON "_subscribers_v" USING btree ("created_at");
  CREATE INDEX "_subscribers_v_updated_at_idx" ON "_subscribers_v" USING btree ("updated_at");
  CREATE INDEX "_subscribers_v_rels_order_idx" ON "_subscribers_v_rels" USING btree ("order");
  CREATE INDEX "_subscribers_v_rels_parent_idx" ON "_subscribers_v_rels" USING btree ("parent_id");
  CREATE INDEX "_subscribers_v_rels_path_idx" ON "_subscribers_v_rels" USING btree ("path");
  CREATE INDEX "_subscribers_v_rels_admins_id_idx" ON "_subscribers_v_rels" USING btree ("admins_id");
  CREATE INDEX "_subscribers_v_rels_users_id_idx" ON "_subscribers_v_rels" USING btree ("users_id");
  CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");
  CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id");
  CREATE INDEX "audit_logs_updated_at_idx" ON "audit_logs" USING btree ("updated_at");
  CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");
  CREATE INDEX "audit_logs_rels_order_idx" ON "audit_logs_rels" USING btree ("order");
  CREATE INDEX "audit_logs_rels_parent_idx" ON "audit_logs_rels" USING btree ("parent_id");
  CREATE INDEX "audit_logs_rels_path_idx" ON "audit_logs_rels" USING btree ("path");
  CREATE INDEX "audit_logs_rels_admins_id_idx" ON "audit_logs_rels" USING btree ("admins_id");
  CREATE INDEX "audit_logs_rels_users_id_idx" ON "audit_logs_rels" USING btree ("users_id");
  CREATE INDEX "_audit_logs_v_parent_idx" ON "_audit_logs_v" USING btree ("parent_id");
  CREATE INDEX "_audit_logs_v_version_version_action_idx" ON "_audit_logs_v" USING btree ("version_action");
  CREATE INDEX "_audit_logs_v_version_version_actor_idx" ON "_audit_logs_v" USING btree ("version_actor_id");
  CREATE INDEX "_audit_logs_v_version_version_updated_at_idx" ON "_audit_logs_v" USING btree ("version_updated_at");
  CREATE INDEX "_audit_logs_v_version_version_created_at_idx" ON "_audit_logs_v" USING btree ("version_created_at");
  CREATE INDEX "_audit_logs_v_created_at_idx" ON "_audit_logs_v" USING btree ("created_at");
  CREATE INDEX "_audit_logs_v_updated_at_idx" ON "_audit_logs_v" USING btree ("updated_at");
  CREATE INDEX "_audit_logs_v_rels_order_idx" ON "_audit_logs_v_rels" USING btree ("order");
  CREATE INDEX "_audit_logs_v_rels_parent_idx" ON "_audit_logs_v_rels" USING btree ("parent_id");
  CREATE INDEX "_audit_logs_v_rels_path_idx" ON "_audit_logs_v_rels" USING btree ("path");
  CREATE INDEX "_audit_logs_v_rels_admins_id_idx" ON "_audit_logs_v_rels" USING btree ("admins_id");
  CREATE INDEX "_audit_logs_v_rels_users_id_idx" ON "_audit_logs_v_rels" USING btree ("users_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_admins_id_idx" ON "payload_locked_documents_rels" USING btree ("admins_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_folders_id_idx" ON "payload_locked_documents_rels" USING btree ("folders_id");
  CREATE INDEX "payload_locked_documents_rels_tags_id_idx" ON "payload_locked_documents_rels" USING btree ("tags_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_ticket_types_id_idx" ON "payload_locked_documents_rels" USING btree ("ticket_types_id");
  CREATE INDEX "payload_locked_documents_rels_organizer_profiles_id_idx" ON "payload_locked_documents_rels" USING btree ("organizer_profiles_id");
  CREATE INDEX "payload_locked_documents_rels_discounts_id_idx" ON "payload_locked_documents_rels" USING btree ("discounts_id");
  CREATE INDEX "payload_locked_documents_rels_guest_list_entries_id_idx" ON "payload_locked_documents_rels" USING btree ("guest_list_entries_id");
  CREATE INDEX "payload_locked_documents_rels_announcements_id_idx" ON "payload_locked_documents_rels" USING btree ("announcements_id");
  CREATE INDEX "payload_locked_documents_rels_event_collections_id_idx" ON "payload_locked_documents_rels" USING btree ("event_collections_id");
  CREATE INDEX "payload_locked_documents_rels_bank_verifications_id_idx" ON "payload_locked_documents_rels" USING btree ("bank_verifications_id");
  CREATE INDEX "payload_locked_documents_rels_bank_change_appeals_id_idx" ON "payload_locked_documents_rels" USING btree ("bank_change_appeals_id");
  CREATE INDEX "payload_locked_documents_rels_free_ticket_links_id_idx" ON "payload_locked_documents_rels" USING btree ("free_ticket_links_id");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_locked_documents_rels_transactions_id_idx" ON "payload_locked_documents_rels" USING btree ("transactions_id");
  CREATE INDEX "payload_locked_documents_rels_tickets_id_idx" ON "payload_locked_documents_rels" USING btree ("tickets_id");
  CREATE INDEX "payload_locked_documents_rels_team_memberships_id_idx" ON "payload_locked_documents_rels" USING btree ("team_memberships_id");
  CREATE INDEX "payload_locked_documents_rels_payout_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("payout_requests_id");
  CREATE INDEX "payload_locked_documents_rels_refunds_id_idx" ON "payload_locked_documents_rels" USING btree ("refunds_id");
  CREATE INDEX "payload_locked_documents_rels_complaints_id_idx" ON "payload_locked_documents_rels" USING btree ("complaints_id");
  CREATE INDEX "payload_locked_documents_rels_subscribers_id_idx" ON "payload_locked_documents_rels" USING btree ("subscribers_id");
  CREATE INDEX "payload_locked_documents_rels_audit_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_logs_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_admins_id_idx" ON "payload_preferences_rels" USING btree ("admins_id");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "payload_llm_instructions_entity_slug_idx" ON "payload_llm_instructions" USING btree ("entity_slug");
  CREATE INDEX "payload_llm_instructions_updated_at_idx" ON "payload_llm_instructions" USING btree ("updated_at");
  CREATE INDEX "payload_llm_instructions_created_at_idx" ON "payload_llm_instructions" USING btree ("created_at");
  CREATE INDEX "payload_llm_instructions_rels_order_idx" ON "payload_llm_instructions_rels" USING btree ("order");
  CREATE INDEX "payload_llm_instructions_rels_parent_idx" ON "payload_llm_instructions_rels" USING btree ("parent_id");
  CREATE INDEX "payload_llm_instructions_rels_path_idx" ON "payload_llm_instructions_rels" USING btree ("path");
  CREATE INDEX "payload_llm_instructions_rels_admins_id_idx" ON "payload_llm_instructions_rels" USING btree ("admins_id");
  CREATE INDEX "payload_llm_instructions_rels_users_id_idx" ON "payload_llm_instructions_rels" USING btree ("users_id");
  CREATE INDEX "platform_settings_rels_order_idx" ON "platform_settings_rels" USING btree ("order");
  CREATE INDEX "platform_settings_rels_parent_idx" ON "platform_settings_rels" USING btree ("parent_id");
  CREATE INDEX "platform_settings_rels_path_idx" ON "platform_settings_rels" USING btree ("path");
  CREATE INDEX "platform_settings_rels_admins_id_idx" ON "platform_settings_rels" USING btree ("admins_id");
  CREATE INDEX "platform_settings_rels_users_id_idx" ON "platform_settings_rels" USING btree ("users_id");
  CREATE INDEX "_platform_settings_v_created_at_idx" ON "_platform_settings_v" USING btree ("created_at");
  CREATE INDEX "_platform_settings_v_updated_at_idx" ON "_platform_settings_v" USING btree ("updated_at");
  CREATE INDEX "_platform_settings_v_rels_order_idx" ON "_platform_settings_v_rels" USING btree ("order");
  CREATE INDEX "_platform_settings_v_rels_parent_idx" ON "_platform_settings_v_rels" USING btree ("parent_id");
  CREATE INDEX "_platform_settings_v_rels_path_idx" ON "_platform_settings_v_rels" USING btree ("path");
  CREATE INDEX "_platform_settings_v_rels_admins_id_idx" ON "_platform_settings_v_rels" USING btree ("admins_id");
  CREATE INDEX "_platform_settings_v_rels_users_id_idx" ON "_platform_settings_v_rels" USING btree ("users_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "admins_sessions" CASCADE;
  DROP TABLE "admins" CASCADE;
  DROP TABLE "admins_rels" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_rels" CASCADE;
  DROP TABLE "_media_v" CASCADE;
  DROP TABLE "_media_v_rels" CASCADE;
  DROP TABLE "folders" CASCADE;
  DROP TABLE "folders_rels" CASCADE;
  DROP TABLE "_folders_v" CASCADE;
  DROP TABLE "_folders_v_rels" CASCADE;
  DROP TABLE "tags" CASCADE;
  DROP TABLE "tags_rels" CASCADE;
  DROP TABLE "_tags_v" CASCADE;
  DROP TABLE "_tags_v_rels" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "users_rels" CASCADE;
  DROP TABLE "_users_v_version_sessions" CASCADE;
  DROP TABLE "_users_v" CASCADE;
  DROP TABLE "_users_v_rels" CASCADE;
  DROP TABLE "events_previous_slugs" CASCADE;
  DROP TABLE "events_sessions" CASCADE;
  DROP TABLE "events_attendee_questions_options" CASCADE;
  DROP TABLE "events_attendee_questions" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "events_rels" CASCADE;
  DROP TABLE "_events_v_version_previous_slugs" CASCADE;
  DROP TABLE "_events_v_version_sessions" CASCADE;
  DROP TABLE "_events_v_version_attendee_questions_options" CASCADE;
  DROP TABLE "_events_v_version_attendee_questions" CASCADE;
  DROP TABLE "_events_v" CASCADE;
  DROP TABLE "_events_v_rels" CASCADE;
  DROP TABLE "ticket_types_perks" CASCADE;
  DROP TABLE "ticket_types" CASCADE;
  DROP TABLE "ticket_types_rels" CASCADE;
  DROP TABLE "_ticket_types_v_version_perks" CASCADE;
  DROP TABLE "_ticket_types_v" CASCADE;
  DROP TABLE "_ticket_types_v_rels" CASCADE;
  DROP TABLE "organizer_profiles" CASCADE;
  DROP TABLE "organizer_profiles_rels" CASCADE;
  DROP TABLE "_organizer_profiles_v" CASCADE;
  DROP TABLE "_organizer_profiles_v_rels" CASCADE;
  DROP TABLE "discounts" CASCADE;
  DROP TABLE "discounts_rels" CASCADE;
  DROP TABLE "_discounts_v" CASCADE;
  DROP TABLE "_discounts_v_rels" CASCADE;
  DROP TABLE "guest_list_entries" CASCADE;
  DROP TABLE "guest_list_entries_rels" CASCADE;
  DROP TABLE "_guest_list_entries_v" CASCADE;
  DROP TABLE "_guest_list_entries_v_rels" CASCADE;
  DROP TABLE "announcements" CASCADE;
  DROP TABLE "announcements_rels" CASCADE;
  DROP TABLE "_announcements_v" CASCADE;
  DROP TABLE "_announcements_v_rels" CASCADE;
  DROP TABLE "event_collections" CASCADE;
  DROP TABLE "event_collections_rels" CASCADE;
  DROP TABLE "_event_collections_v" CASCADE;
  DROP TABLE "_event_collections_v_rels" CASCADE;
  DROP TABLE "bank_verifications" CASCADE;
  DROP TABLE "bank_verifications_rels" CASCADE;
  DROP TABLE "_bank_verifications_v" CASCADE;
  DROP TABLE "_bank_verifications_v_rels" CASCADE;
  DROP TABLE "bank_change_appeals_audit_history" CASCADE;
  DROP TABLE "bank_change_appeals" CASCADE;
  DROP TABLE "bank_change_appeals_rels" CASCADE;
  DROP TABLE "_bank_change_appeals_v_version_audit_history" CASCADE;
  DROP TABLE "_bank_change_appeals_v" CASCADE;
  DROP TABLE "_bank_change_appeals_v_rels" CASCADE;
  DROP TABLE "free_ticket_links" CASCADE;
  DROP TABLE "free_ticket_links_rels" CASCADE;
  DROP TABLE "_free_ticket_links_v" CASCADE;
  DROP TABLE "_free_ticket_links_v_rels" CASCADE;
  DROP TABLE "orders_items" CASCADE;
  DROP TABLE "orders_attendee_answers" CASCADE;
  DROP TABLE "orders" CASCADE;
  DROP TABLE "orders_rels" CASCADE;
  DROP TABLE "_orders_v_version_items" CASCADE;
  DROP TABLE "_orders_v_version_attendee_answers" CASCADE;
  DROP TABLE "_orders_v" CASCADE;
  DROP TABLE "_orders_v_rels" CASCADE;
  DROP TABLE "transactions" CASCADE;
  DROP TABLE "transactions_rels" CASCADE;
  DROP TABLE "_transactions_v" CASCADE;
  DROP TABLE "_transactions_v_rels" CASCADE;
  DROP TABLE "tickets" CASCADE;
  DROP TABLE "tickets_rels" CASCADE;
  DROP TABLE "_tickets_v" CASCADE;
  DROP TABLE "_tickets_v_rels" CASCADE;
  DROP TABLE "team_memberships_permissions" CASCADE;
  DROP TABLE "team_memberships" CASCADE;
  DROP TABLE "team_memberships_rels" CASCADE;
  DROP TABLE "_team_memberships_v_version_permissions" CASCADE;
  DROP TABLE "_team_memberships_v" CASCADE;
  DROP TABLE "_team_memberships_v_rels" CASCADE;
  DROP TABLE "payout_requests" CASCADE;
  DROP TABLE "payout_requests_rels" CASCADE;
  DROP TABLE "_payout_requests_v" CASCADE;
  DROP TABLE "_payout_requests_v_rels" CASCADE;
  DROP TABLE "refunds" CASCADE;
  DROP TABLE "refunds_rels" CASCADE;
  DROP TABLE "_refunds_v" CASCADE;
  DROP TABLE "_refunds_v_rels" CASCADE;
  DROP TABLE "complaints" CASCADE;
  DROP TABLE "complaints_rels" CASCADE;
  DROP TABLE "_complaints_v" CASCADE;
  DROP TABLE "_complaints_v_rels" CASCADE;
  DROP TABLE "subscribers" CASCADE;
  DROP TABLE "subscribers_rels" CASCADE;
  DROP TABLE "_subscribers_v" CASCADE;
  DROP TABLE "_subscribers_v_rels" CASCADE;
  DROP TABLE "audit_logs" CASCADE;
  DROP TABLE "audit_logs_rels" CASCADE;
  DROP TABLE "_audit_logs_v" CASCADE;
  DROP TABLE "_audit_logs_v_rels" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "payload_llm_instructions" CASCADE;
  DROP TABLE "payload_llm_instructions_rels" CASCADE;
  DROP TABLE "platform_settings" CASCADE;
  DROP TABLE "platform_settings_rels" CASCADE;
  DROP TABLE "_platform_settings_v" CASCADE;
  DROP TABLE "_platform_settings_v_rels" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_users_account_status";
  DROP TYPE "public"."enum_users_account_type";
  DROP TYPE "public"."enum__users_v_version_role";
  DROP TYPE "public"."enum__users_v_version_account_status";
  DROP TYPE "public"."enum__users_v_version_account_type";
  DROP TYPE "public"."enum_events_attendee_questions_type";
  DROP TYPE "public"."enum_events_category";
  DROP TYPE "public"."enum_events_event_format";
  DROP TYPE "public"."enum_events_visibility";
  DROP TYPE "public"."enum_events_age_restriction";
  DROP TYPE "public"."enum_events_check_in_status";
  DROP TYPE "public"."enum_events_schedule_type";
  DROP TYPE "public"."enum_events_page_appearance";
  DROP TYPE "public"."enum_events_review_status";
  DROP TYPE "public"."enum_events_status";
  DROP TYPE "public"."enum__events_v_version_attendee_questions_type";
  DROP TYPE "public"."enum__events_v_version_category";
  DROP TYPE "public"."enum__events_v_version_event_format";
  DROP TYPE "public"."enum__events_v_version_visibility";
  DROP TYPE "public"."enum__events_v_version_age_restriction";
  DROP TYPE "public"."enum__events_v_version_check_in_status";
  DROP TYPE "public"."enum__events_v_version_schedule_type";
  DROP TYPE "public"."enum__events_v_version_page_appearance";
  DROP TYPE "public"."enum__events_v_version_review_status";
  DROP TYPE "public"."enum__events_v_version_status";
  DROP TYPE "public"."enum__events_v_published_locale";
  DROP TYPE "public"."enum_ticket_types_ticket_kind";
  DROP TYPE "public"."enum_ticket_types_preset";
  DROP TYPE "public"."enum_ticket_types_ticket_mode";
  DROP TYPE "public"."enum_ticket_types_visibility";
  DROP TYPE "public"."enum_ticket_types_sales_status";
  DROP TYPE "public"."enum__ticket_types_v_version_ticket_kind";
  DROP TYPE "public"."enum__ticket_types_v_version_preset";
  DROP TYPE "public"."enum__ticket_types_v_version_ticket_mode";
  DROP TYPE "public"."enum__ticket_types_v_version_visibility";
  DROP TYPE "public"."enum__ticket_types_v_version_sales_status";
  DROP TYPE "public"."enum_discounts_kind";
  DROP TYPE "public"."enum__discounts_v_version_kind";
  DROP TYPE "public"."enum_guest_list_entries_status";
  DROP TYPE "public"."enum__guest_list_entries_v_version_status";
  DROP TYPE "public"."enum_announcements_audience";
  DROP TYPE "public"."enum_announcements_delivery_status";
  DROP TYPE "public"."enum__announcements_v_version_audience";
  DROP TYPE "public"."enum__announcements_v_version_delivery_status";
  DROP TYPE "public"."enum_bank_verifications_status";
  DROP TYPE "public"."enum__bank_verifications_v_version_status";
  DROP TYPE "public"."enum_bank_change_appeals_status";
  DROP TYPE "public"."enum__bank_change_appeals_v_version_status";
  DROP TYPE "public"."enum_free_ticket_links_status";
  DROP TYPE "public"."enum__free_ticket_links_v_version_status";
  DROP TYPE "public"."enum_orders_order_kind";
  DROP TYPE "public"."enum_orders_status";
  DROP TYPE "public"."enum__orders_v_version_order_kind";
  DROP TYPE "public"."enum__orders_v_version_status";
  DROP TYPE "public"."enum_transactions_provider";
  DROP TYPE "public"."enum_transactions_status";
  DROP TYPE "public"."enum__transactions_v_version_provider";
  DROP TYPE "public"."enum__transactions_v_version_status";
  DROP TYPE "public"."enum_tickets_source";
  DROP TYPE "public"."enum_tickets_status";
  DROP TYPE "public"."enum__tickets_v_version_source";
  DROP TYPE "public"."enum__tickets_v_version_status";
  DROP TYPE "public"."enum_team_memberships_permissions";
  DROP TYPE "public"."enum_team_memberships_role";
  DROP TYPE "public"."enum_team_memberships_invitation_status";
  DROP TYPE "public"."enum__team_memberships_v_version_permissions";
  DROP TYPE "public"."enum__team_memberships_v_version_role";
  DROP TYPE "public"."enum__team_memberships_v_version_invitation_status";
  DROP TYPE "public"."enum_payout_requests_status";
  DROP TYPE "public"."enum__payout_requests_v_version_status";
  DROP TYPE "public"."enum_refunds_status";
  DROP TYPE "public"."enum__refunds_v_version_status";
  DROP TYPE "public"."enum_complaints_status";
  DROP TYPE "public"."enum__complaints_v_version_status";
  DROP TYPE "public"."enum_subscribers_status";
  DROP TYPE "public"."enum__subscribers_v_version_status";
  DROP TYPE "public"."enum_audit_logs_category";
  DROP TYPE "public"."enum__audit_logs_v_version_category";
  DROP TYPE "public"."enum_payload_llm_instructions_entity_type";`)
}
