import { Request } from "express";
import { getRedisConnection } from "../databases/redis/redis";

const FAILURES_BEFORE_CAPTCHA = 3;
const TTL_MS = 15 * 60 * 1000;

type Attempt = {
  count: number;
  exp: number;
};

// Only used when Redis is not configured, which means a single process.
const attempts = new Map<string, Attempt>();

const redisKey = (key: string) => `login-failures:${key}`;

const purge = () => {
  const now = Date.now();
  attempts.forEach((attempt, key) => {
    if (attempt.exp <= now) {
      attempts.delete(key);
    }
  });
};

const getFailureCount = async (key: string) => {
  const redis = getRedisConnection();
  if (redis) {
    return Number(await redis.get(redisKey(key))) || 0;
  }
  purge();
  return attempts.get(key)?.count ?? 0;
};

const incrementFailureCount = async (key: string) => {
  const redis = getRedisConnection();
  if (redis) {
    const results = await redis
      .multi()
      .incr(redisKey(key))
      .pexpire(redisKey(key), TTL_MS)
      .exec();
    const [error, count] = results?.[0] ?? [];
    if (error) {
      throw error;
    }
    return Number(count);
  }
  purge();
  const count = (attempts.get(key)?.count ?? 0) + 1;
  attempts.set(key, { count, exp: Date.now() + TTL_MS });
  return count;
};

export const loginAttemptKey = (req: Request) =>
  req.ip || req.socket.remoteAddress || "unknown";

export const loginCaptchaRequired = async (key: string) =>
  (await getFailureCount(key)) > FAILURES_BEFORE_CAPTCHA;

export const recordLoginFailure = async (key: string) =>
  (await incrementFailureCount(key)) > FAILURES_BEFORE_CAPTCHA;

export const clearLoginFailures = async (key: string) => {
  const redis = getRedisConnection();
  if (redis) {
    await redis.del(redisKey(key));
    return;
  }
  attempts.delete(key);
};
