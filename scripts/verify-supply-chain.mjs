import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync("package.json", "utf8"));
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
assert.ok(lock.lockfileVersion >= 3, "package-lock.json must use lockfile version 3 or newer");

const requiredScriptApprovals = new Set();
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path || entry.link) continue;
  if (entry.resolved) {
    const resolved = new URL(entry.resolved);
    assert.equal(resolved.protocol, "https:", `${path} is not fetched over HTTPS`);
    assert.equal(resolved.hostname, "registry.npmjs.org", `${path} is not pinned to the npm registry`);
    assert.match(entry.integrity ?? "", /^sha512-/, `${path} lacks SHA-512 integrity`);
  }
  const excludedFromLinux =
    entry.optional === true &&
    Array.isArray(entry.os) &&
    !entry.os.includes("linux");
  if (entry.hasInstallScript && !excludedFromLinux) {
    const packageName = path.split("node_modules/").at(-1);
    requiredScriptApprovals.add(`${packageName}@${entry.version}`);
  }
}

assert.deepEqual(
  new Set(Object.keys(manifest.allowScripts ?? {})),
  requiredScriptApprovals,
  "allowScripts must exactly match Linux install-script packages in the lockfile",
);
for (const [name, approved] of Object.entries(manifest.allowScripts ?? {}))
  assert.equal(approved, true, `${name} is not explicitly approved`);

const npmCli = process.env.npm_execpath;
assert.ok(npmCli, "verify:supply-chain must be run through npm");
const sbom = JSON.parse(
  execFileSync(
    process.execPath,
    [npmCli, "sbom", "--sbom-format=cyclonedx", "--omit=dev"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    },
  ),
);
assert.equal(sbom.bomFormat, "CycloneDX");
assert.ok(sbom.components?.length > 0, "production SBOM contains no components");

console.log(
  `Supply-chain policy verified: ${sbom.components.length} SBOM components and ${requiredScriptApprovals.size} exact install-script approvals.`,
);
