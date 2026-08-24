CREATE INDEX room_actions_room_order_idx
  ON room_actions (room_id, is_active, display_order, created_at);

CREATE INDEX room_action_purchases_action_created_idx
  ON room_action_purchases (action_id, created_at DESC);

CREATE INDEX room_action_purchases_viewer_created_idx
  ON room_action_purchases (viewer_id, created_at DESC);

CREATE INDEX private_show_sessions_room_started_idx
  ON private_show_sessions (room_id, started_at DESC);

CREATE INDEX chat_messages_sender_created_idx
  ON chat_messages (sender_id, created_at DESC);
