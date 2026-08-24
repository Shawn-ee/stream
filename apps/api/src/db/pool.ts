import {
  Pool,
  type PoolClient,
  type QueryResult,
  type QueryResultRow,
} from "pg";
import { config, required } from "../config.js";

const pool = new Pool({
  connectionString: required(config.databaseUrl, "DATABASE_URL"),
  max: config.databasePoolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});
let poolErrorsTotal = 0;

pool.on("error", (error) => {
  poolErrorsTotal += 1;
  console.error(
    JSON.stringify({
      level: "error",
      event: "database_pool_error",
      name: error.name,
    }),
  );
});

export function database() {
  let client: PoolClient | null = null;
  return {
    async connect() {
      if (!client) client = await pool.connect();
    },
    async query<Row extends QueryResultRow = any>(
      text: string,
      values?: any[],
    ): Promise<QueryResult<Row>> {
      if (!client) throw new Error("Database session is not connected.");
      return client.query<Row>(text, values);
    },
    async end() {
      client?.release();
      client = null;
    },
  };
}

export function databasePoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    max: config.databasePoolMax,
    errorsTotal: poolErrorsTotal,
  };
}

export async function closeDatabasePool() {
  await pool.end();
}
