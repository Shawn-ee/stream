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
      "schema_migrations",
    ]) {
      assert.ok(tables.has(table), `Expected ${table} to exist`);
    }
  } finally {
    await client.end();
  }
});
