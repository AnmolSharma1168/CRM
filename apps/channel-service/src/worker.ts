import { Worker, Job } from 'bullmq';
import axios from 'axios';
import { redisConnection, IS_MOCK_REDIS } from './redis';
import { QUEUE_NAME, CallbackJobData } from './queue';
import { MockWorker } from './mockQueue';

// Operations Metrics Store
export const queueMetrics = {
  totalJobsProcessed: 0,
  totalLatencyMs: 0,
  callbackFailures: 0,
  failedJobs: 0,
  retries: 0,
};

async function sendCallback(url: string, payload: object): Promise<void> {
  try {
    await axios.post(url, payload, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json', 'X-Source': 'xeno-channel-service' },
    });
    console.log(`  ✅ Callback sent: ${JSON.stringify(payload)}`);
  } catch (err) {
    queueMetrics.callbackFailures++; // Track callback failure attempt
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ Callback failed: ${message}`);
    throw err; // BullMQ/MockWorker will retry
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processCallbackJob(job: Job<CallbackJobData>): Promise<void> {
  const { communicationId, callbackUrl, outcome, willOpen, willClick, willConvert, customerId, delayMs } = job.data;

  console.log(`\n🔄 Processing job ${job.id} for comm ${communicationId}`);
  console.log(`   Outcome: ${outcome} | willOpen: ${willOpen} | willClick: ${willClick} | willConvert: ${willConvert}`);

  // Wait the simulated delay
  await sleep(delayMs);

  // Record latency
  queueMetrics.totalJobsProcessed++;
  queueMetrics.totalLatencyMs += delayMs;

  // Send primary outcome (delivered or failed)
  await sendCallback(callbackUrl, {
    communicationId,
    status: outcome,
    timestamp: new Date().toISOString(),
  });

  if (outcome === 'failed') return;

  // Simulate open event
  if (willOpen) {
    await sleep(Math.random() * 3000 + 1000); // 1-4 more seconds
    await sendCallback(callbackUrl, {
      communicationId,
      status: 'opened',
      timestamp: new Date().toISOString(),
    });

    // Simulate click event
    if (willClick) {
      await sleep(Math.random() * 5000 + 1000); // 1-6 more seconds
      await sendCallback(callbackUrl, {
        communicationId,
        status: 'clicked',
        timestamp: new Date().toISOString(),
      });

      // Simulate conversion
      if (willConvert && customerId) {
        await sleep(Math.random() * 4000 + 1000); // 1-5 more seconds
        const ordersUrl = callbackUrl.replace('/api/receipts', '/api/customers/orders');
        const orderAmount = Math.floor(Math.random() * (5000 - 500 + 1)) + 500; // ₹500 – ₹5000
        const orderDate = new Date().toISOString().split('T')[0];

        try {
          console.log(`🛒 Simulating conversion for customer ${customerId}...`);
          await axios.post(ordersUrl, {
            customer_id: customerId,
            amount: orderAmount,
            product_name: "Mock Attributed Purchase",
            category: "E-Commerce",
            order_date: orderDate,
            channel: "online",
          }, { timeout: 10000 });
          console.log(`   ✅ Conversion order of ₹${orderAmount} submitted successfully`);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`   ❌ Failed to submit conversion order: ${errMsg}`);
        }
      }
    }
  }
}

export function startWorker(): any {
  if (IS_MOCK_REDIS) {
    const worker = new MockWorker(QUEUE_NAME, processCallbackJob);

    worker.on('completed', (job) => {
      console.log(`✅ [Mock] Job ${job.id} completed`);
    });

    worker.on('failed-attempt', (job) => {
      console.log(`⚠️ [Mock] Job ${job.id} failed attempt, retrying...`);
      queueMetrics.retries++;
    });

    worker.on('failed', (job, err) => {
      console.error(`❌ [Mock] Job ${job?.id} failed permanently: ${err.message}`);
      queueMetrics.failedJobs++;
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
    if (job.attemptsMade > 1) {
      queueMetrics.retries += (job.attemptsMade - 1);
    }
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed permanently: ${err.message}`);
    queueMetrics.failedJobs++;
    if (job && job.attemptsMade > 1) {
      queueMetrics.retries += (job.attemptsMade - 1);
    }
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });

  console.log('👷 BullMQ worker started (concurrency: 20)');
  return worker;
}
