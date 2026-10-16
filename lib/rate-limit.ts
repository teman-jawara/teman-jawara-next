interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

// In-memory sliding window tracker
const ipTracker = new Map<string, { count: number; resetTime: number }>();

/**
 * Checks and updates rate limits for specific actions (login, register).
 */
export function checkRateLimit(
  ip: string,
  action: string,
  options: RateLimitOptions,
): { allowed: boolean; remaining: number; retryAfterSeconds?: number } {
  const key = `${action}:${ip}`;
  const now = Date.now();
  const record = ipTracker.get(key);

  // Periodically clean expired entries
  if (ipTracker.size > 1000) {
    for (const [k, v] of ipTracker.entries()) {
      if (now > v.resetTime) {
        ipTracker.delete(k);
      }
    }
  }

  if (!record || now > record.resetTime) {
    ipTracker.set(key, { count: 1, resetTime: now + options.windowMs });
    return { allowed: true, remaining: options.limit - 1 };
  }

  if (record.count >= options.limit) {
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  record.count += 1;
  return { allowed: true, remaining: options.limit - record.count };
}

/**
 * Safely extracts client IP address from request headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}
