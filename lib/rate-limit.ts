type Bucket = {
  remaining: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function applyRateLimit(
  key: string,
  {
    windowMs = 60_000,
    limit = 30,
  }: { windowMs?: number; limit?: number } = {}
) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    const fresh: Bucket = {
      remaining: limit - 1,
      resetAt: now + windowMs,
    };
    buckets.set(key, fresh);
    return {
      success: true,
      remaining: fresh.remaining,
      resetAt: fresh.resetAt,
    };
  }

  if (bucket.remaining <= 0) {
    return {
      success: false,
      remaining: 0,
      resetAt: bucket.resetAt,
    };
  }

  bucket.remaining -= 1;
  buckets.set(key, bucket);

  return {
    success: true,
    remaining: bucket.remaining,
    resetAt: bucket.resetAt,
  };
}
