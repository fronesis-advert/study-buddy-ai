import { Redis } from "@upstash/redis";

// In-memory fallback for local development
const rateLimitMap = new Map<
  string,
  { count: number; resetAt: number }
>();

type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

type RateLimitResult =
  | { success: true }
  | { success: false; resetAt: number };

// Initialize Redis if credentials are available
let redis: Redis | null = null;
try {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (upstashUrl && upstashToken) {
    redis = new Redis({
      url: upstashUrl,
      token: upstashToken,
    });
  } else {
    console.warn(
      "⚠️  UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not found. " +
      "Using in-memory rate limiting (NOT SAFE FOR PRODUCTION). " +
      "Get free Redis at: https://upstash.com"
    );
  }
} catch (error) {
  console.error("Failed to initialize Redis:", error);
}

async function applyRateLimitRedis(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (!redis) {
    return applyRateLimitMemory(key, config);
  }

  const now = Date.now();
  const windowKey = `ratelimit:${key}:${Math.floor(now / config.windowMs)}`;

  try {
    const count = await redis.incr(windowKey);
    
    // Set expiry on first request
    if (count === 1) {
      await redis.pexpire(windowKey, config.windowMs);
    }

    if (count > config.limit) {
      const ttl = await redis.pttl(windowKey);
      return { 
        success: false, 
        resetAt: now + (ttl > 0 ? ttl : config.windowMs) 
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Redis rate limit error, falling back to memory:", error);
    return applyRateLimitMemory(key, config);
  }
}

function applyRateLimitMemory(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const existing = rateLimitMap.get(key);

  if (!existing || existing.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + config.windowMs });
    return { success: true };
  }

  if (existing.count >= config.limit) {
    return { success: false, resetAt: existing.resetAt };
  }

  existing.count++;
  return { success: true };
}

export function applyRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult | Promise<RateLimitResult> {
  if (redis) {
    return applyRateLimitRedis(key, config);
  }
  return applyRateLimitMemory(key, config);
}
