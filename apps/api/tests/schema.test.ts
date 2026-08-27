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
      "gift_acknowledgements",
      "streamer_profiles",
      "live_rooms",
      "gift_catalog",
      "wallet_ledger",
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
        (table_name='notifications' AND column_name IN ('room_id','notification_key'))
        OR (table_name='gifts' AND column_name IN ('combo_count','combo_expires_at'))
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
      "notifications.room_id",
      "notifications.notification_key",
      "gifts.combo_count",
      "gifts.combo_expires_at",
    ]) assert.ok(accountColumnNames.has(column), `Expected ${column} to exist`);
  } finally {
    await client.end();
  }
});
