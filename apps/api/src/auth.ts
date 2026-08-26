import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { config } from "./config.js";
import { database } from "./db/pool.js";

const scrypt = promisify(scryptCallback);
export type AuthRole = "audience" | "streamer" | "admin";
export type AuthUser = {
  id: string;
  handle: string;
  displayName: string;
  role: AuthRole;
  locale: "en" | "zh";
  ageAcknowledged: boolean;
};

export type RegistrationInput = {
  handle: string;
  displayName: string;
  password: string;
  locale: "en" | "zh";
};

export class RegistrationError extends Error {
  constructor(
    public readonly code:
      | "invalid_handle"
      | "invalid_display_name"
      | "reserved_handle"
      | "weak_password"
      | "handle_unavailable",
  ) {
    super(code);
  }
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function passwordRecord(
  password: string,
  salt = randomBytes(16).toString("base64url"),
) {
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return { salt, hash: derived.toString("base64url") };
}

export async function verifyPassword(
  password: string,
  salt: string,
  expected: string,
) {
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const target = Buffer.from(expected, "base64url");
  return actual.length === target.length && timingSafeEqual(actual, target);
}

export async function authenticateCredentials(
  handle: string,
  password: string,
): Promise<AuthUser | null> {
  const client = database();
  await client.connect();
  try {
    const result = await client.query(
      "SELECT id,handle,display_name,role,locale,test_age_acknowledged_at,is_banned,password_hash,password_salt FROM users WHERE handle=$1",
      [handle.trim().toLowerCase()],
    );
    const user = result.rows[0];
    if (
      !user?.password_hash ||
      !user?.password_salt ||
      user.is_banned ||
      !(await verifyPassword(password, user.password_salt, user.password_hash))
    )
      return null;
    return {
      id: user.id,
      handle: user.handle,
      displayName: user.display_name,
      role: user.role,
      locale: user.locale,
      ageAcknowledged: Boolean(user.test_age_acknowledged_at),
    };
  } finally {
    await client.end();
  }
}

export async function registerAudienceAccount(
  input: RegistrationInput,
): Promise<AuthUser> {
  const handle = input.handle.trim().toLowerCase();
  const displayName = input.displayName.trim();
  if (!/^[a-z0-9_]{3,30}$/.test(handle))
    throw new RegistrationError("invalid_handle");
  if (displayName.length < 2 || displayName.length > 50)
    throw new RegistrationError("invalid_display_name");
  if (handle.startsWith("demo-") || handle.startsWith("demo_"))
    throw new RegistrationError("reserved_handle");
  if (
    input.password.length < 12 ||
    !/[a-z]/.test(input.password) ||
    !/[A-Z]/.test(input.password) ||
    !/[0-9]/.test(input.password)
  )
    throw new RegistrationError("weak_password");

  const credentials = await passwordRecord(input.password);
  const id = crypto.randomUUID();
  const client = database();
  await client.connect();
  try {
    await client.query(
      `INSERT INTO users
       (id,handle,display_name,role,locale,password_hash,password_salt)
       VALUES ($1,$2,$3,'audience',$4,$5,$6)`,
      [id, handle, displayName, input.locale, credentials.hash, credentials.salt],
    );
  } catch (error) {
    if ((error as { code?: string }).code === "23505")
      throw new RegistrationError("handle_unavailable");
    throw error;
  } finally {
    await client.end();
  }
  return {
    id,
    handle,
    displayName,
    role: "audience",
    locale: input.locale,
    ageAcknowledged: false,
  };
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const csrfToken = randomBytes(24).toString("base64url");
  const expiresAt = new Date(
    Date.now() + config.sessionTtlHours * 60 * 60 * 1000,
  );
  const client = database();
  await client.connect();
  try {
    await client.query("DELETE FROM auth_sessions WHERE expires_at <= NOW()");
    await client.query(
      "INSERT INTO auth_sessions (token_hash,user_id,csrf_token,expires_at) VALUES ($1,$2,$3,$4)",
      [tokenHash(token), userId, csrfToken, expiresAt],
    );
  } finally {
    await client.end();
  }
  return { token, csrfToken, expiresAt };
}

export async function userForSessionToken(
  token?: string,
): Promise<AuthUser | null> {
  if (!token) return null;
  const client = database();
  await client.connect();
  try {
    const result = await client.query(
      "SELECT u.id,u.handle,u.display_name,u.role,u.locale,u.test_age_acknowledged_at,u.is_banned FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW()",
      [tokenHash(token)],
    );
    const user = result.rows[0];
    if (!user || user.is_banned) return null;
    await client.query(
      "UPDATE auth_sessions SET last_seen_at=NOW() WHERE token_hash=$1",
      [tokenHash(token)],
    );
    return {
      id: user.id,
      handle: user.handle,
      displayName: user.display_name,
      role: user.role,
      locale: user.locale,
      ageAcknowledged: Boolean(user.test_age_acknowledged_at),
    };
  } finally {
    await client.end();
  }
}

export async function revokeSession(token?: string) {
  if (!token) return;
  const client = database();
  await client.connect();
  try {
    await client.query("DELETE FROM auth_sessions WHERE token_hash=$1", [
      tokenHash(token),
    ]);
  } finally {
    await client.end();
  }
}

export function sessionTokenFromCookieHeader(header?: string) {
  return header
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("stream_session="))
    ?.slice("stream_session=".length);
}
