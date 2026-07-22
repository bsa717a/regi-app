export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
};

export type RateLimitStore = {
  incr(
    key: string,
    windowMs: number,
  ): Promise<{ count: number; resetAt: number }>;
};

/** In-memory store — fine for single-instance local/dev; swap for Redis later. */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<
    string,
    { count: number; resetAt: number }
  >();

  async incr(
    key: string,
    windowMs: number,
  ): Promise<{ count: number; resetAt: number }> {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      const entry = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, entry);
      return entry;
    }

    existing.count += 1;
    return existing;
  }

  /** Test helper */
  clear(): void {
    this.buckets.clear();
  }
}

const defaultStore = new MemoryRateLimitStore();

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  store?: RateLimitStore;
};

export async function rateLimit(
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const store = options.store ?? defaultStore;
  const { count, resetAt } = await store.incr(options.key, options.windowMs);
  const remaining = Math.max(0, options.limit - count);

  return {
    allowed: count <= options.limit,
    remaining,
    resetAt,
    limit: options.limit,
  };
}

export function clientKeyFromRequest(request: Request, suffix: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `${suffix}:${ip}`;
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
