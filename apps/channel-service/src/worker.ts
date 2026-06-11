import { Worker, Job } from 'bullmq';
import axios from 'axios';
import { redisConnection, IS_MOCK_REDIS } from './redis';
import { QUEUE_NAME, CallbackJobData } from './queue';
import { MockWorker } from './mockQueue';

// Realistic outcome distributions per spec:
// 70% delivered, 10% failed, 20% "lost" (silent fail treated as failed)
// Of delivered: 40% opened
// Of opened: 20% clicked

async function sendCallback(url: string, payload: object): Promise<void> {
  try {
    await axios.post(url, payload, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json', 'X-Source': 'xeno-channel-service' },
    });
    console.log(`  ✅ Callback sent: ${JSON.stringify(payload)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ Callback failed: ${message}`);
    throw err; // BullMQ will retry
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processCallbackJob(job: Job<CallbackJobData>): Promise<void> {
  const { communicationId, callbackUrl, outcome, willOpen, willClick, delayMs } = job.data;

  console.log(`\n🔄 Processing job ${job.id} for comm ${communicationId}`);
  console.log(`   Outcome: ${outcome} | willOpen: ${willOpen} | willClick: ${willClick}`);

  // Wait the simulated delay
  await sleep(delayMs);

  // Send primary outcome (delivered or failed)
  await sendCallback(callbackUrl, {
    communicationId,
    status: outcome,
    timestamp: new Date().toISOString(),
  });

  if (outcome === 'failed') return;

  // Simulate open event (40% of delivered)
  if (willOpen) {
    await sleep(Math.random() * 3000 + 1000); // 1-4 more seconds
    await sendCallback(callbackUrl, {
      communicationId,
      status: 'opened',
      timestamp: new Date().toISOString(),
    });

    // Simulate click event (20% of opened)
    if (willClick) {
      await sleep(Math.random() * 5000 + 1000); // 1-6 more seconds
      await sendCallback(callbackUrl, {
        communicationId,
        status: 'clicked',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export function startWorker(): any {
  if (IS_MOCK_REDIS) {
    const worker = new MockWorker(QUEUE_NAME, processCallbackJob);

    worker.on('completed', (job) => {
      console.log(`✅ [Mock] Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`❌ [Mock] Job ${job?.id} failed: ${err.message}`);
    });

    console.log('👷 Mock worker started (in-memory)');
    return worker;
  }

  const worker = new Worker<CallbackJobData>(QUEUE_NAME, processCallbackJob, {
    connection: redisConnection,
    concurrency: 20,
  });

  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed: ${err.message}`);
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });

  console.log('👷 BullMQ worker started (concurrency: 20)');
  return worker;
}
