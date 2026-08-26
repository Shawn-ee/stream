import {
  config,
  hasCloudflareStreamConfiguration,
  required,
} from "./config.js";

type TokenResponse = { success: boolean; result?: { token?: string }; errors?: { message?: string }[] };

export async function createPlaybackUrl(liveInputId: string): Promise<string> {
  if (!hasCloudflareStreamConfiguration())
    throw new Error("Cloudflare Stream playback is unavailable.");
  const accountId = required(config.cloudflare.accountId, "CLOUDFLARE_ACCOUNT_ID");
  const token = required(config.cloudflare.apiToken, "CLOUDFLARE_API_TOKEN");
  const customerCode = required(config.cloudflare.customerCode, "CLOUDFLARE_STREAM_CUSTOMER_CODE").replace(/^https?:\/\//, "");
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${liveInputId}/token`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: "{}",
    });
    const payload = await response.json() as TokenResponse;
    if (!response.ok || !payload.success || !payload.result?.token)
      throw new Error("Cloudflare Stream rejected the playback request.");
    return `https://${customerCode}/${payload.result.token}/iframe`;
  } catch {
    throw new Error("Cloudflare Stream playback is unavailable.");
  }
}
