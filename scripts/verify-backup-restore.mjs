import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const restoreDatabase = "stream_mvp_restore_check";
const postgresUser = process.env.POSTGRES_USER ?? "stream_mvp";
const sourceDatabase = process.env.POSTGRES_DB ?? "stream_mvp";
function docker(args, input) {
  const result = spawnSync("docker", ["compose", ...args], {
    cwd: process.cwd(),
    input,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0)
    throw new Error(
      result.stderr || result.stdout || `docker exited ${result.status}`,
    );
  return result.stdout;
}

assert.equal(restoreDatabase, "stream_mvp_restore_check");
const dump = docker([
  "exec",
  "-T",
  "postgres",
  "pg_dump",
  "-U",
  postgresUser,
  "--no-owner",
  "--no-privileges",
  sourceDatabase,
]);
assert.ok(dump.includes("CREATE TABLE public.users"));
docker([
  "exec",
  "-T",
  "postgres",
  "dropdb",
  "-U",
  postgresUser,
  "--if-exists",
  restoreDatabase,
]);
try {
  docker([
    "exec",
    "-T",
    "postgres",
    "createdb",
    "-U",
    postgresUser,
    restoreDatabase,
  ]);
  docker(
    [
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      postgresUser,
      "-d",
      restoreDatabase,
      "-v",
      "ON_ERROR_STOP=1",
    ],
    dump,
  );
  const count = docker([
    "exec",
    "-T",
    "postgres",
    "psql",
    "-U",
    postgresUser,
    "-d",
    restoreDatabase,
    "-tAc",
    "SELECT COUNT(*) FROM users",
  ]);
  assert.ok(Number(count.trim()) >= 4);
} finally {
  docker([
    "exec",
    "-T",
    "postgres",
    "dropdb",
    "-U",
    postgresUser,
    "--if-exists",
    "--force",
    restoreDatabase,
  ]);
}
console.log("Disposable PostgreSQL logical backup and restore drill verified.");
