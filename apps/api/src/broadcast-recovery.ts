import type { BroadcastStatus } from "./broadcast-status.js";

export const broadcastRecoveryMessage = "The creator is reconnecting.";

export function broadcastLifecycleEvent(
  previousState: BroadcastStatus["state"],
  nextState: BroadcastStatus["state"],
  recovering: boolean,
) {
  if (nextState === "unavailable") return "broadcast_status_unavailable";
  if (recovering && nextState === "connecting") return "broadcast_interrupted";
  if (recovering && nextState === "live") return "broadcast_recovered";
  if (recovering && nextState === "offline") return "broadcast_ended";
  if (nextState === "live") return "broadcast_started";
  if (previousState === "live") return "broadcast_ended";
  return "broadcast_status_checked";
}

export function statusDuringRecovery(
  status: BroadcastStatus,
  recoveryDeadline: number | undefined,
  now = Date.now(),
): { status: BroadcastStatus; recoveryComplete: boolean } {
  if (status.state === "live") return { status, recoveryComplete: true };
  if (status.state === "offline" && recoveryDeadline && recoveryDeadline > now)
    return {
      status: {
        state: "connecting",
        message: broadcastRecoveryMessage,
        source: "cloudflare",
      },
      recoveryComplete: false,
    };
  return {
    status,
    recoveryComplete: Boolean(recoveryDeadline && recoveryDeadline <= now),
  };
}
