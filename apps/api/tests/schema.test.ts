import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "pg";

test("schema contains the full local prototype data model", async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    const tables = new Set(result.rows.map((row) => row.tablename));
    for (const table of [
      "users",
      "auth_sessions",
      "account_security_events",
      "creator_applications",
      "creator_application_events",
      "creator_accounts",
      "creator_onboarding",
      "identity_verifications",
      "creator_identity_documents",
      "creator_agreement_versions",
      "creator_agreement_acceptances",
      "creator_status_history",
      "audit_events",
      "admin_permissions",
      "creator_review_decisions",
      "gift_acknowledgements",
      "streamer_profiles",
      "live_rooms",
      "gift_catalog",
      "wallet_ledger",
      "test_credit_orders",
      "gifts",
      "room_actions",
      "room_action_purchases",
      "chat_messages",
      "moderation_events",
      "private_show_sessions",
      "private_show_access",
      "follows",
      "notifications",
      "room_visits",
      "content_reports",
      "room_lifecycle_events",
      "broadcast_sessions",
      "room_moderation_restrictions",
      "audience_discovery_preferences",
      "supported_languages",
      "tags",
      "room_languages",
      "room_tags",
      "legacy_category_migration_report",
      "schema_migrations",
    ]) {
      assert.ok(tables.has(table), `Expected ${table} to exist`);
    }
    const columns = await client.query<{ table_name: string; column_name: string }>(`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND ((table_name = 'gift_catalog' AND column_name IN ('symbol', 'animation_tier', 'display_order'))
          OR (table_name = 'gifts' AND column_name = 'quantity'))
    `);
    const giftColumns = new Set(
      columns.rows.map((row) => `${row.table_name}.${row.column_name}`),
    );
    for (const column of [
      "gift_catalog.symbol",
      "gift_catalog.animation_tier",
      "gift_catalog.display_order",
      "gifts.quantity",
    ]) {
      assert.ok(giftColumns.has(column), `Expected ${column} to exist`);
    }
    const accountColumns = await client.query<{ table_name: string; column_name: string }>(`
      SELECT table_name,column_name FROM information_schema.columns
      WHERE table_schema='public' AND (
        (table_name='auth_sessions' AND column_name IN ('session_id','client_label')) OR
        (table_name='users' AND column_name='password_changed_at') OR
        (table_name='streamer_profiles' AND column_name IN ('next_stream_at','schedule_timezone')) OR
        (table_name='follows' AND column_name='reminder_enabled') OR
        (table_name='notifications' AND column_name IN ('room_id','notification_key'))
        OR (table_name='gifts' AND column_name IN ('combo_count','combo_expires_at'))
        OR (table_name='creator_accounts' AND column_name IN ('activation_method','administrative_review_status'))
        OR (table_name='creator_agreement_acceptances' AND column_name IN ('age_confirmed','agreement_confirmed','audit_event_id'))
        OR (table_name='creator_identity_documents' AND column_name IN ('storage_reference','status','reviewed_by'))
      )
    `);
    const accountColumnNames = new Set(
      accountColumns.rows.map((row) => `${row.table_name}.${row.column_name}`),
    );
    for (const column of [
      "auth_sessions.session_id",
      "auth_sessions.client_label",
      "users.password_changed_at",
      "streamer_profiles.next_stream_at",
      "streamer_profiles.schedule_timezone",
      "follows.reminder_enabled",
      "creator_accounts.activation_method",
      "creator_accounts.administrative_review_status",
      "creator_agreement_acceptances.age_confirmed",
      "creator_agreement_acceptances.agreement_confirmed",
      "creator_agreement_acceptances.audit_event_id",
      "creator_identity_documents.storage_reference",
      "creator_identity_documents.status",
      "creator_identity_documents.reviewed_by",
      "notifications.room_id",
      "notifications.notification_key",
      "gifts.combo_count",
      "gifts.combo_expires_at",
    ]) assert.ok(accountColumnNames.has(column), `Expected ${column} to exist`);
    const polishColumns = await client.query<{ table_name: string; column_name: string }>(`
      SELECT table_name,column_name FROM information_schema.columns
      WHERE table_schema='public' AND (
        (table_name='live_rooms' AND column_name IN ('stream_language','stream_tags','stream_thumbnail_url','chat_slow_mode_seconds','blocked_terms','broadcast_status_source')) OR
        (table_name='room_moderation_restrictions' AND column_name IN ('is_banned','muted_until')) OR
        (table_name='chat_messages' AND column_name IN ('deleted_at','deleted_by'))
      )
    `);
    const polishColumnNames = new Set(polishColumns.rows.map((row) => `${row.table_name}.${row.column_name}`));
    for (const column of [
      "live_rooms.stream_language",
      "live_rooms.stream_tags",
      "live_rooms.stream_thumbnail_url",
      "live_rooms.chat_slow_mode_seconds",
      "live_rooms.blocked_terms",
      "live_rooms.broadcast_status_source",
      "room_moderation_restrictions.is_banned",
      "room_moderation_restrictions.muted_until",
      "chat_messages.deleted_at",
      "chat_messages.deleted_by",
    ]) assert.ok(polishColumnNames.has(column), `Expected ${column} to exist`);
    const creatorColumns = await client.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='live_rooms' AND column_name='publication_status'",
    );
    assert.equal(creatorColumns.rows[0]?.column_name, "publication_status");
    const suspiciousView = await client.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.views WHERE table_schema='public' AND table_name='suspicious_audience_creator_resources'",
    );
    assert.equal(suspiciousView.rows[0]?.table_name, "suspicious_audience_creator_resources");
    const followerIndex = await client.query<{ indexname: string }>(
      "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname='follows_streamer_created_idx'",
    );
    assert.equal(followerIndex.rows[0]?.indexname, "follows_streamer_created_idx");
    const orderIndex = await client.query<{ indexname: string }>(
      "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname='test_credit_orders_user_created_idx'",
    );
    assert.equal(orderIndex.rows[0]?.indexname, "test_credit_orders_user_created_idx");
    const reminderIndexes = await client.query<{ indexname: string }>(
      "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN ('follows_reminder_delivery_idx','notifications_unread_schedule_idx') ORDER BY indexname",
    );
    assert.deepEqual(reminderIndexes.rows.map((row) => row.indexname), [
      "follows_reminder_delivery_idx",
      "notifications_unread_schedule_idx",
    ]);
    const preferenceColumns = await client.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='audience_discovery_preferences' ORDER BY column_name",
    );
    const preferenceColumnNames = new Set(preferenceColumns.rows.map((row) => row.column_name));
    for (const column of [
      "user_id",
      "preferred_languages",
      "preferred_categories",
      "preferred_tag_slugs",
      "prioritize_live",
      "prioritize_following",
      "personalization_enabled",
      "updated_at",
    ]) assert.ok(preferenceColumnNames.has(column), `Expected audience_discovery_preferences.${column} to exist`);
    const preferenceIndex = await client.query<{ indexname: string }>(
      "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname='audience_discovery_preferences_updated_idx'",
    );
    assert.equal(preferenceIndex.rows[0]?.indexname, "audience_discovery_preferences_updated_idx");
  } finally {
    await client.end();
  }
});
