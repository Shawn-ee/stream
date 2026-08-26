import assert from "node:assert/strict";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const inputId = process.env.CLOUDFLARE_STREAM_LIVE_INPUT_ID;
assert.ok(accountId && apiToken && inputId, "Stream provider configuration is incomplete.");

const headers = { authorization: `Bearer ${apiToken}` };
const inputResponse = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/live_inputs/${inputId}`,
  { headers },
);
const input = await inputResponse.json();
assert.equal(inputResponse.status, 200);
assert.equal(input.success, true);
assert.equal(input.result?.uid, inputId);
assert.equal(input.result?.status?.current?.state, "disconnected");

const tokenResponse = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${inputId}/token`,
  {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: "{}",
  },
);
const token = await tokenResponse.json();
assert.equal(tokenResponse.status, 200);
assert.equal(token.success, true);
assert.ok(token.result?.token);
assert.equal(JSON.stringify(token).includes(apiToken), false);

console.log(
  "Production Stream provider verified: existing input is offline and signed playback token issuance succeeds without exposing credentials.",
);
