const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;

if (!accountId || !token) {
  throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required.");
}

const response = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/tokens/verify`,
  { headers: { Authorization: `Bearer ${token}` } },
);
const payload = await response.json();

if (!response.ok || !payload.success) {
  throw new Error("Cloudflare token verification failed.");
}

console.log("Cloudflare Stream development token verified.");
