import { Queue } from 'bullmq';
import { redisConnection, IS_MOCK_REDIS } from './redis';
import { mockQueueInstance } from './mockQueue';

export const QUEUE_NAME = 'channel-callbacks';

export interface CallbackJobData {
  communicationId: string;
  callbackUrl: string;
  channel: string;
  recipient: string;
  delayMs: number;
  // Resolved outcomes
  outcome: 'delivered' | 'failed';
  willOpen: boolean;
  willClick: boolean;
  willConvert?: boolean;
  customerId?: string;
}

export const callbackQueue = IS_MOCK_REDIS
  ? (mockQueueInstance as any)
  : new Queue<CallbackJobData>(QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
      },
    });

if (!IS_MOCK_REDIS) {
  console.log(`📬 BullMQ queue "${QUEUE_NAME}" initialized`);
}
