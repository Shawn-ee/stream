import { createConnection } from "node:net";
import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
if (!databaseUrl || !redisUrl) throw new Error("DATABASE_URL and REDIS_URL are required.");

const database = new Client({ connectionString: databaseUrl });
await database.connect();
try {
  await database.query("SELECT 1");
} finally {
  await database.end();
}

const redis = new URL(redisUrl);
await new Promise<void>((resolve, reject) => {
  const socket = createConnection({ host: redis.hostname, port: Number(redis.port || 6379) });
  socket.once("error", reject);
  socket.once("connect", () => {
    socket.end();
    resolve();
  });
});

console.log("Local PostgreSQL and Redis connectivity verified.");
