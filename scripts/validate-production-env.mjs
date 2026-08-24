import { statSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  parseEnvironment,
  validateProductionEnvironment,
} from "./production-environment.mjs";

const file = resolve(process.argv[2] ?? ".env.production");

try {
  const stats = statSync(file);
  if (process.platform !== "win32" && (stats.mode & 0o077) !== 0)
    throw new Error("production environment file permissions must be 600 or stricter");
  const environment = parseEnvironment(readFileSync(file, "utf8"));
  const mode = validateProductionEnvironment(environment);
  console.log(
    `Production environment is valid (${mode.privateTunnel ? "private SSH tunnel" : "private HTTPS"}; Cloudflare Stream ${mode.cloudflareEnabled ? "enabled" : "disabled"}).`,
  );
} catch (error) {
  const message =
    error instanceof Error
      ? error.message.split(/\r?\n/, 1)[0]
      : "unknown validation error";
  console.error(`Production environment rejected: ${message}`);
  process.exitCode = 1;
}
