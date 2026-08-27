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

export class AccountSecurityError extends Error {
  constructor(
    public readonly code:
      | "current_password_invalid"
      | "weak_password"
      | "password_reuse",
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

export function passwordIsStrong(password: string) {
  return (
    password.length >= 12 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
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
  if (!passwordIsStrong(input.password))
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

export async function createSession(
  userId: string,
  clientLabel = "Browser session",
) {
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
      "INSERT INTO auth_sessions (token_hash,user_id,csrf_token,expires_at,client_label) VALUES ($1,$2,$3,$4,$5)",
      [tokenHash(token), userId, csrfToken, expiresAt, clientLabel.slice(0, 80)],
    );
  } finally {
    await client.end();
  }
  return { token, csrfToken, expiresAt };
}

export function clientLabelForUserAgent(userAgent?: string) {
  if (!userAgent) return "Browser session";
  const mobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
  const platform = /Windows/i.test(userAgent)
    ? "Windows"
    : /Mac OS|Macintosh/i.test(userAgent)
      ? "macOS"
      : /Android/i.test(userAgent)
        ? "Android"
        : /iPhone|iPad/i.test(userAgent)
          ? "iOS"
          : /Linux/i.test(userAgent)
            ? "Linux"
            : "device";
  return `${mobile ? "Mobile" : "Desktop"} browser on ${platform}`;
}

export async function listUserSessions(userId: string, currentToken?: string) {
  const currentHash = currentToken ? tokenHash(currentToken) : "";
  const client = database();
  await client.connect();
  try {
    const result = await client.query(
      `SELECT session_id,client_label,created_at,last_seen_at,expires_at,
              token_hash=$2 AS is_current
       FROM auth_sessions
       WHERE user_id=$1 AND expires_at>NOW()
       ORDER BY is_current DESC,last_seen_at DESC
       LIMIT 50`,
      [userId, currentHash],
    );
    return result.rows.map((session) => ({
      id: session.session_id,
      label: session.client_label,
      createdAt: session.created_at,
      lastSeenAt: session.last_seen_at,
      expiresAt: session.expires_at,
      current: session.is_current,
    }));
  } finally {
    await client.end();
  }
}

export async function revokeUserSession(
  userId: string,
  sessionId: string,
  currentToken?: string,
) {
  const currentHash = currentToken ? tokenHash(currentToken) : "";
  const client = database();
  await client.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ is_current: boolean }>(
      `DELETE FROM auth_sessions
       WHERE user_id=$1 AND session_id=$2
       RETURNING token_hash=$3 AS is_current`,
      [userId, sessionId, currentHash],
    );
    if (result.rows[0])
      await client.query(
        "INSERT INTO account_security_events (id,user_id,event_type) VALUES ($1,$2,'session_revoked')",
        [crypto.randomUUID(), userId],
      );
    await client.query("COMMIT");
    return result.rows[0] ?? null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

export async function revokeOtherUserSessions(
  userId: string,
  currentToken?: string,
) {
  const currentHash = currentToken ? tokenHash(currentToken) : "";
  const client = database();
  await client.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      "DELETE FROM auth_sessions WHERE user_id=$1 AND token_hash<>$2 RETURNING session_id",
      [userId, currentHash],
    );
    if ((result.rowCount ?? 0) > 0)
      await client.query(
        "INSERT INTO account_security_events (id,user_id,event_type) VALUES ($1,$2,'other_sessions_revoked')",
        [crypto.randomUUID(), userId],
      );
    await client.query("COMMIT");
    return result.rowCount ?? 0;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

export async function changeAccountPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  if (!passwordIsStrong(newPassword))
    throw new AccountSecurityError("weak_password");
  const client = database();
  await client.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{
      password_hash: string;
      password_salt: string;
    }>(
      "SELECT password_hash,password_salt FROM users WHERE id=$1 FOR UPDATE",
      [userId],
    );
    const credentials = result.rows[0];
    if (
      !credentials ||
      !(await verifyPassword(
        currentPassword,
        credentials.password_salt,
        credentials.password_hash,
      ))
    )
      throw new AccountSecurityError("current_password_invalid");
    if (
      await verifyPassword(
        newPassword,
        credentials.password_salt,
        credentials.password_hash,
      )
    )
      throw new AccountSecurityError("password_reuse");
    const next = await passwordRecord(newPassword);
    await client.query(
      "UPDATE users SET password_hash=$1,password_salt=$2,password_changed_at=NOW(),updated_at=NOW() WHERE id=$3",
      [next.hash, next.salt, userId],
    );
    await client.query("DELETE FROM auth_sessions WHERE user_id=$1", [userId]);
    await client.query(
      "INSERT INTO account_security_events (id,user_id,event_type) VALUES ($1,$2,'password_changed')",
      [crypto.randomUUID(), userId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
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
