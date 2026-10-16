import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const SESSION_COOKIE_NAME = "tj_session";
// 30 days in seconds
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export interface AuthenticatedUser {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  faculty?: string | null;
  study_program?: string | null;
  profile_id?: string | null;
}

interface SessionRow extends RowDataPacket {
  session_id: string;
  expires_at: Date;
  user_id: string;
  email: string;
  profile_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  faculty: string | null;
  study_program: string | null;
}

/**
 * Hashes a plaintext password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * Verifies a plaintext password against a bcrypt hash.
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Creates a cryptographically secure random session token,
 * hashes it with SHA-256 for secure MySQL storage, and returns the raw token.
 */
export async function createSession(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  // 32 bytes (64 hex characters) of cryptographic entropy
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  await db.query(
    `INSERT INTO sessions (id, user_id, session_token_hash, expires_at)
     VALUES (?, ?, ?, ?)`,
    [sessionId, userId, tokenHash, expiresAt],
  );

  return { token: rawToken, expiresAt };
}

/**
 * Invalidates and deletes a session from MySQL.
 */
export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await db.query(`DELETE FROM sessions WHERE session_token_hash = ?`, [
    tokenHash,
  ]);
}

/**
 * Extracts a cookie value by name from a raw Cookie header string.
 */
function getCookieFromHeader(header: string | null, name: string): string | null {
  if (!header) return null;
  const match = header
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? match.substring(name.length + 1) : null;
}

/**
 * Retrieves and validates the authenticated user from the current session.
 * 1. Checks HTTP-only cookie (tj_session).
 * 2. Checks Bearer token (Authorization header) if provided.
 * 3. Supports test header in non-production environments.
 * 4. Verifies active session against MySQL sessions table.
 */
export async function getAuthenticatedUser(
  request?: Request,
): Promise<AuthenticatedUser | null> {
  let token: string | null = null;

  // 1. Try Bearer token from Authorization header
  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      token = authHeader.substring(7).trim();
    }
  }

  // 2. Try session cookie from request headers or Next.js cookies()
  if (!token && request) {
    const cookieHeader = request.headers.get("cookie");
    token = getCookieFromHeader(cookieHeader, SESSION_COOKIE_NAME);
  }

  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
    } catch {
      // cookies() may throw outside Next.js request contexts
    }
  }

  // 3. If token found, validate in MySQL
  if (token) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    try {
      const [rows] = await db.query<SessionRow[]>(
        `SELECT 
          s.id AS session_id,
          s.expires_at,
          u.id AS user_id,
          u.email,
          pr.id AS profile_id,
          pr.full_name,
          pr.avatar_url,
          pr.faculty,
          pr.study_program
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN profiles pr ON u.id = pr.user_id
        WHERE s.session_token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP`,
        [tokenHash],
      );

      if (rows.length > 0) {
        const row = rows[0];
        return {
          id: row.user_id,
          email: row.email,
          full_name: row.full_name,
          avatar_url: row.avatar_url,
          faculty: row.faculty,
          study_program: row.study_program,
          profile_id: row.profile_id,
        };
      }
    } catch (err) {
      console.error("[Session Validation Error]:", err);
    }
  }

  // 4. In development / testing environments ONLY:
  // Support explicit test header for automated tests and curl checks
  if (process.env.NODE_ENV !== "production" && request) {
    const testUserId = request.headers.get("x-test-user-id");
    if (testUserId) {
      return {
        id: testUserId,
        email:
          request.headers.get("x-test-user-email") ||
          `test-${testUserId.slice(0, 8)}@untirta.ac.id`,
      };
    }
  }

  return null;
}

/**
 * Ensures user existence in users table (compatible with foreign keys).
 */
export async function ensureUserRecord(user: AuthenticatedUser): Promise<void> {
  const fallbackEmail = `${user.id}@teman-jawara.local`;
  const email = user.email || fallbackEmail;

  await db.query(
    `INSERT INTO users (id, email, password_hash)
     VALUES (?, ?, '')
     ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
    [user.id, email],
  );
}
