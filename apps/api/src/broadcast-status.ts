import { config, hasCloudflareStreamConfiguration } from "./config.js";

export type BroadcastState = "live" | "connecting" | "offline" | "unavailable";
export type BroadcastStatus = { state: BroadcastState; message: string; source: "local" | "cloudflare" };

export function normalizeCloudflareLiveInput(value: unknown): BroadcastStatus {
  const current = (
    value as { status?: { current?: { state?: unknown; reason?: unknown } } }
  )?.status?.current;
  const state =
    typeof current?.state === "string" ? current.state.toLowerCase() : "";
  if (["connected", "live", "active"].includes(state))
    return {
      state: "live",
      message: "Broadcast is live.",
      source: "cloudflare",
    };
  if (["pending", "connecting", "starting", "initializing"].includes(state))
    return {
      state: "connecting",
      message: "Broadcast is connecting.",
      source: "cloudflare",
    };
  if (["disconnected", "stopped", "idle", "offline"].includes(state))
    return {
      state: "offline",
      message: "Broadcast is offline.",
      source: "cloudflare",
    };
  return {
    state: "unavailable",
    message: "Broadcast status is temporarily unavailable.",
    source: "cloudflare",
  };
}

export function localBroadcastStatus(): BroadcastStatus {
  const state = config.localBroadcastStatus;
  const messages: Record<BroadcastState, string> = {
    live: "Local development fallback reports a live broadcast.",
    connecting: "Local development fallback reports a connecting broadcast.",
    offline: "Local test broadcast is offline.",
    unavailable: "Broadcast status is temporarily unavailable.",
  };
  return { state, message: messages[state], source: "local" };
}

export async function cloudflareBroadcastStatus(liveInputId: string): Promise<BroadcastStatus> {
  if (!hasCloudflareStreamConfiguration())
    return { state: "unavailable", message: "Broadcast status is temporarily unavailable.", source: "cloudflare" };
  try {
    const accountId = config.cloudflare.accountId!;
    const token = config.cloudflare.apiToken!;
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/live_inputs/${liveInputId}`, { headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) return { state: "unavailable", message: "Broadcast status is temporarily unavailable.", source: "cloudflare" };
    const payload = await response.json() as { success?: boolean; result?: unknown };
    if (!payload.success) return { state: "unavailable", message: "Broadcast status is temporarily unavailable.", source: "cloudflare" };
    return normalizeCloudflareLiveInput(payload.result);
  } catch {
    return { state: "unavailable", message: "Broadcast status is temporarily unavailable.", source: "cloudflare" };
  }
}
