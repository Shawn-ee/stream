import { Client } from "pg";
import { config, required } from "../config.js";
import { passwordRecord } from "../auth.js";

const accounts = [
  [
    "10000000-0000-4000-8000-000000000001",
    "demo-audience",
    "Demo Audience",
    "audience",
  ],
  [
    "10000000-0000-4000-8000-000000000002",
    "demo-streamer",
    "Demo Streamer",
    "streamer",
  ],
  ["10000000-0000-4000-8000-000000000003", "demo-admin", "Demo Admin", "admin"],
  [
    "10000000-0000-4000-8000-000000000004",
    "demo-night-creator",
    "Night Creator",
    "streamer",
  ],
] as const;

const client = new Client({
  connectionString: required(config.databaseUrl, "DATABASE_URL"),
});
const demoPassword = await passwordRecord(config.localDemoPassword);
await client.connect();
try {
  for (const [id, handle, displayName, role] of accounts) {
    await client.query(
      `INSERT INTO users (id, handle, display_name, role, password_hash, password_salt)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, role = EXCLUDED.role, locale='en',test_age_acknowledged_at=NULL,password_hash=EXCLUDED.password_hash, password_salt=EXCLUDED.password_salt, is_muted = FALSE, is_banned = FALSE, updated_at = NOW()`,
      [id, handle, displayName, role, demoPassword.hash, demoPassword.salt],
    );
  }
  await client.query(
    "DELETE FROM auth_sessions WHERE user_id = ANY($1::uuid[])",
    [accounts.map((account) => account[0])],
  );
  await client.query(
    `INSERT INTO streamer_profiles (user_id, bio, category, is_featured)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (user_id) DO UPDATE SET bio = EXCLUDED.bio, avatar_url=NULL, category = EXCLUDED.category, is_featured = EXCLUDED.is_featured`,
    [
      accounts[1][0],
      "A test-only streamer profile for local product development.",
      "General",
    ],
  );
  await client.query(
    "UPDATE streamer_profiles SET schedule_text = 'Weekdays 8 PM Central · Test schedule', category = 'Featured',next_stream_at=NOW()+INTERVAL '1 day',schedule_timezone='America/Chicago' WHERE user_id = $1",
    [accounts[1][0]],
  );
  await client.query(
    `INSERT INTO gift_catalog (id,name_en,name_zh,coin_cost,animation_key,symbol,animation_tier,display_order,is_active) VALUES
      ('30000000-0000-4000-8000-000000000001','Spark','火花',1,'spark','✦','small',1,TRUE),
      ('30000000-0000-4000-8000-000000000002','Heart','心意',5,'heart','♥','small',2,TRUE),
      ('30000000-0000-4000-8000-000000000003','Rose','玫瑰',10,'rose','❀','small',3,TRUE),
      ('30000000-0000-4000-8000-000000000004','Star','星光',20,'star','★','small',4,TRUE),
      ('30000000-0000-4000-8000-000000000005','Crown','皇冠',50,'crown','♛','highlight',5,TRUE),
      ('30000000-0000-4000-8000-000000000006','Diamond','钻石',100,'diamond','◆','highlight',6,TRUE),
      ('30000000-0000-4000-8000-000000000007','Phoenix','凤凰',1000,'phoenix','🔥','celebration',7,TRUE),
      ('30000000-0000-4000-8000-000000000008','Galaxy','星河',10000,'galaxy','✺','premium',8,TRUE)
     ON CONFLICT (id) DO UPDATE SET name_en=EXCLUDED.name_en,name_zh=EXCLUDED.name_zh,coin_cost=EXCLUDED.coin_cost,animation_key=EXCLUDED.animation_key,symbol=EXCLUDED.symbol,animation_tier=EXCLUDED.animation_tier,display_order=EXCLUDED.display_order,is_active=TRUE`,
  );
  await client.query(
    "UPDATE gift_catalog SET is_active=FALSE WHERE id NOT IN ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000006','30000000-0000-4000-8000-000000000007','30000000-0000-4000-8000-000000000008')",
  );
  await client.query(
    `INSERT INTO wallet_ledger (id,user_id,entry_type,amount,idempotency_key,reference_type) VALUES ('40000000-0000-4000-8000-000000000001',$1,'seed_credit',20000,'seed-demo-audience-20000','seed') ON CONFLICT (id) DO UPDATE SET user_id=EXCLUDED.user_id,entry_type=EXCLUDED.entry_type,amount=EXCLUDED.amount,idempotency_key=EXCLUDED.idempotency_key,reference_type=EXCLUDED.reference_type`,
    [accounts[0][0]],
  );
  await client.query(
    `INSERT INTO live_rooms (id, streamer_id, slug, title, status, cloudflare_live_input_id)
     VALUES ($1, $2, $3, $4, 'live', $5)
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status, cloudflare_live_input_id = EXCLUDED.cloudflare_live_input_id, updated_at = NOW()`,
    [
      "20000000-0000-4000-8000-000000000001",
      accounts[1][0],
      "demo-streamer",
      "Demo Streamer: Local Live Room",
      config.cloudflare.liveInputId ?? null,
    ],
  );
  await client.query(
    "UPDATE live_rooms SET private_show_enabled = FALSE, goal_text = 'Test goal: enjoy the stream.', status=CASE WHEN $1='live' THEN 'live'::room_status ELSE 'offline'::room_status END, broadcast_state=$1::broadcast_lifecycle_state, broadcast_checked_at=NOW(), broadcast_status_message=$2 WHERE id = '20000000-0000-4000-8000-000000000001'",
    [
      config.localBroadcastStatus,
      `Local development fallback reports ${config.localBroadcastStatus} broadcast.`,
    ],
  );
  await client.query(
    "UPDATE private_show_sessions SET status = 'ended', ended_at = NOW() WHERE room_id = '20000000-0000-4000-8000-000000000001' AND status = 'live'",
  );
  await client.query(
    "DELETE FROM content_reports WHERE room_id = '20000000-0000-4000-8000-000000000001'",
  );
  await client.query(
    "DELETE FROM room_visits WHERE room_id = '20000000-0000-4000-8000-000000000001'",
  );
  await client.query("DELETE FROM notifications WHERE user_id IN ($1,$2,$3)", [
    accounts[0][0],
    accounts[1][0],
    accounts[2][0],
  ]);
  await client.query(
    "DELETE FROM follows WHERE follower_id IN ($1,$2,$3) OR streamer_id IN ($1,$2,$3)",
    [accounts[0][0], accounts[1][0], accounts[2][0]],
  );
  await client.query(
    "DELETE FROM broadcast_sessions WHERE room_id IN ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002')",
  );
  await client.query(
    "DELETE FROM room_lifecycle_events WHERE room_id IN ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002')",
  );
  await client.query(
    "DELETE FROM chat_messages WHERE room_id = '20000000-0000-4000-8000-000000000001'",
  );
  await client.query(
    "DELETE FROM moderation_events WHERE room_id = '20000000-0000-4000-8000-000000000001'",
  );
  await client.query(
    "DELETE FROM room_moderation_restrictions WHERE room_id = '20000000-0000-4000-8000-000000000001'",
  );
  await client.query(
    "DELETE FROM private_show_access WHERE session_id IN (SELECT id FROM private_show_sessions WHERE room_id = '20000000-0000-4000-8000-000000000001')",
  );
  await client.query(
    "DELETE FROM private_show_sessions WHERE room_id = '20000000-0000-4000-8000-000000000001'",
  );
  await client.query(
    "DELETE FROM gifts WHERE room_id = '20000000-0000-4000-8000-000000000001'",
  );
  await client.query(
    "DELETE FROM room_action_purchases WHERE action_id IN (SELECT id FROM room_actions WHERE room_id='20000000-0000-4000-8000-000000000001')",
  );
  await client.query(
    "DELETE FROM room_actions WHERE room_id='20000000-0000-4000-8000-000000000001'",
  );
  await client.query("DELETE FROM wallet_ledger WHERE user_id IN ($1,$2,$3)", [
    accounts[0][0],
    accounts[1][0],
    accounts[2][0],
  ]);
  await client.query(
    "INSERT INTO wallet_ledger (id, user_id, entry_type, amount, idempotency_key, reference_type) VALUES ('40000000-0000-4000-8000-000000000001', $1, 'seed_credit', 20000, 'seed-demo-audience-20000', 'seed')",
    [accounts[0][0]],
  );
  await client.query(
    "UPDATE live_rooms SET goal_text='Test goal: enjoy the stream.',goal_target=500,goal_progress=0,broadcast_transport='obs_hls' WHERE id='20000000-0000-4000-8000-000000000001'",
  );
  await client.query(
    "INSERT INTO room_actions (id,room_id,title,coin_cost,duration_label,display_order) VALUES ('50000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Wave hello',25,'Quick action',1),('50000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Creator choice',75,'5 min',2)",
  );
  await client.query(
    "INSERT INTO streamer_profiles (user_id,bio,category,schedule_text) VALUES ($1,'A second local creator for discovery testing.','Music','Weekends 10 PM Central - Test schedule') ON CONFLICT (user_id) DO UPDATE SET bio=EXCLUDED.bio,avatar_url=NULL,category=EXCLUDED.category,schedule_text=EXCLUDED.schedule_text",
    [accounts[3][0]],
  );
  await client.query(
    "UPDATE streamer_profiles SET next_stream_at=NOW()+INTERVAL '2 days',schedule_timezone='America/Chicago' WHERE user_id=$1",
    [accounts[3][0]],
  );
  await client.query(
    "INSERT INTO live_rooms (id,streamer_id,slug,title,status,goal_text,broadcast_state,broadcast_checked_at,broadcast_status_message) VALUES ($1,$2,'night-creator','Night Creator: Music Room','offline','Test goal: enjoy the music.','offline',NOW(),'Local test broadcast is offline.') ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,status=EXCLUDED.status,goal_text=EXCLUDED.goal_text,broadcast_state=EXCLUDED.broadcast_state,broadcast_checked_at=EXCLUDED.broadcast_checked_at,broadcast_status_message=EXCLUDED.broadcast_status_message",
    ["20000000-0000-4000-8000-000000000002", accounts[3][0]],
  );
  console.log(
    "Seeded demo audience, streamer, admin, and second creator accounts.",
  );
} finally {
  await client.end();
}
