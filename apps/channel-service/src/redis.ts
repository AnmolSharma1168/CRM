import { ConnectionOptions } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL;

// Detect placeholder / missing Redis URL → fall back to in-memory mock
export const IS_MOCK_REDIS =
  !REDIS_URL || REDIS_URL.includes('your-redis') || REDIS_URL === 'mock';

// Parse Redis URL into BullMQ connection options
// BullMQ accepts a plain object with host/port/password/tls
function parseRedisUrl(url: string): ConnectionOptions {
  try {
    const parsed = new URL(url);
    const isTls = parsed.protocol === 'rediss:';
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || (isTls ? '6380' : '6379')),
      password: parsed.password || undefined,
      username: parsed.username || undefined,
      tls: isTls ? {} : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    } as ConnectionOptions;
  } catch {
    return { url } as unknown as ConnectionOptions;
  }
}

export const redisConnection: ConnectionOptions = parseRedisUrl(REDIS_URL || '');

if (IS_MOCK_REDIS) {
  console.log('⚠️  No real Redis URL — using in-memory Mock Queue (dev mode)');
} else {
  console.log('✅ Redis connection configured for BullMQ');
}
