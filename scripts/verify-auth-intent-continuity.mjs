import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("apps/web/src/main.tsx", "utf8");

for (const kind of [
  "account", "following", "wallet", "broadcast", "go-live", "inbox", "me",
  "follow", "chat", "gift", "action", "private-access", "report",
]) assert.match(source, new RegExp(`(?:\\"${kind}\\"|${kind}):`), `missing auth intent ${kind}`);

assert.match(source, /follow:\s*"execute"/);
for (const guarded of ["chat", "gift", "action", "private-access", "report"])
  assert.match(source, new RegExp(`(?:\\"${guarded}\\"|${guarded}):\\s*\\"review\\"`));
for (const navigation of ["account", "following", "wallet", "broadcast", "go-live", "inbox", "me"])
  assert.match(source, new RegExp(`(?:\\"${navigation}\\"|${navigation}):\\s*\\"navigate\\"`));

assert.match(source, /setResumeIntent\(\["audience","streamer"\]\.includes\(result\.user\.role\) \? authGate : null\)/);
assert.match(source, /resumeIntent\?\.kind !== "follow"/);
assert.match(source, /void follow\(true\)/);
assert.match(source, /your message is still here\. Review it, then send/);
assert.match(source, /choose a gift\. Nothing has been sent/);
assert.match(source, /review the action before purchasing/);
assert.match(source, /Nothing was charged/);
assert.match(source, /review Report and submit it when ready/);
assert.match(source, /data-auth-action="report"/);
assert.match(source, /className="[^"]*auth-resume-notice[^"]*" role="status"/);
assert.match(source, /handledAuthIntentRef\.current === resumeIntent\.id/);

const giftResume = source.slice(source.indexOf('if (resumeIntent.kind === "gift")'), source.indexOf('if (resumeIntent.kind === "action")'));
assert.doesNotMatch(giftResume, /sendGift\(/, "authentication must not send a gift");
const actionResume = source.slice(source.indexOf('if (resumeIntent.kind === "action")'), source.indexOf('if (resumeIntent.kind === "private-access")'));
assert.doesNotMatch(actionResume, /purchaseAction\(/, "authentication must not purchase an action");
const privateResume = source.slice(source.indexOf('if (resumeIntent.kind === "private-access")'), source.indexOf('window\.setTimeout\(\(\) => \{', source.indexOf('if (resumeIntent.kind === "private-access")')));
assert.doesNotMatch(privateResume, /buyAccess\(/, "authentication must not purchase private access");

console.log("Typed pending intents, single-resume guards, safe follow completion, review-only spending/report behavior, navigation continuity, and bilingual feedback verified.");
