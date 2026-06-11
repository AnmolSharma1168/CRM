import 'dotenv/config';
import 'express-async-errors';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { callbackQueue } from './queue';
import { startWorker } from './worker';
import type { CallbackJobData } from './queue';

const app = express();
const PORT = process.env.CHANNEL_SERVICE_PORT ?? process.env.PORT ?? 3002;

app.use(cors());
app.use(express.json());

// ---- Outcome simulation ------------------------------------
function simulateOutcome(): {
  outcome: 'delivered' | 'failed';
  willOpen: boolean;
  willClick: boolean;
  willConvert: boolean;
  delayMs: number;
} {
  const rand = Math.random();
  
  // 90% delivered, 10% failed
  const isDelivered = rand < 0.90;
  const outcome: 'delivered' | 'failed' = isDelivered ? 'delivered' : 'failed';

  // 70% of delivered will open
  const willOpen = isDelivered && Math.random() < 0.70;
  
  // 20% of opened will click
  const willClick = willOpen && Math.random() < 0.20;

  // 5% of clicked will convert
  const willConvert = willClick && Math.random() < 0.05;

  // Random delay 2-8 seconds
  const delayMs = Math.floor(Math.random() * 6000) + 2000;

  return { outcome, willOpen, willClick, willConvert, delayMs };
}

// ---- Validation --------------------------------------------
const SendSchema = z.object({
  recipient: z.string().min(1),
  message: z.string().min(1),
  channel: z.enum(['whatsapp', 'sms', 'email', 'rcs']),
  communicationId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  callbackUrl: z.string().url(),
});

// ---- POST /send --------------------------------------------
app.post('/send', async (req: Request, res: Response) => {
  const payload = SendSchema.parse(req.body);
  
  const { outcome, willOpen, willClick, willConvert, delayMs } = simulateOutcome();
  
  const jobData: CallbackJobData = {
    communicationId: payload.communicationId,
    callbackUrl: payload.callbackUrl,
    channel: payload.channel,
    recipient: payload.recipient,
    delayMs,
    outcome,
    willOpen,
    willClick,
    willConvert,
    customerId: payload.customerId,
  };

  // Enqueue to BullMQ — NOT setTimeout
  const job = await callbackQueue.add('channel-callback', jobData, {
    delay: 0, // Worker controls the delay internally
  });

  console.log(`📨 Queued job ${job.id} for comm ${payload.communicationId} → ${outcome} (delay: ${delayMs}ms)`);

  res.status(202).json({
    success: true,
    data: {
      jobId: job.id,
      communicationId: payload.communicationId,
      queued: true,
    },
  });
});

// ---- GET /health -------------------------------------------
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: { status: 'ok', service: 'xeno-channel-service', ts: new Date().toISOString() },
  });
});

import { queueMetrics } from './worker';

// ---- GET /queue/stats --------------------------------------
app.get('/queue/stats', async (_req: Request, res: Response) => {
  const [waiting, active, completed, failed] = await Promise.all([
    callbackQueue.getWaitingCount(),
    callbackQueue.getActiveCount(),
    callbackQueue.getCompletedCount(),
    callbackQueue.getFailedCount(),
  ]);

  const avgLatencyMs = queueMetrics.totalJobsProcessed > 0
    ? Math.round(queueMetrics.totalLatencyMs / queueMetrics.totalJobsProcessed)
    : 0;

  res.json({
    success: true,
    data: {
      waiting,
      active,
      completed,
      failed,
      avgLatencyMs,
      failedJobsCount: queueMetrics.failedJobs,
      retryCount: queueMetrics.retries,
      callbackFailuresCount: queueMetrics.callbackFailures,
      health: 'healthy',
    },
  });
});

// ---- Error handler -----------------------------------------
app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error('[Channel Service Error]', err.message);
  const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
  res.status(statusCode).json({ success: false, error: err.message });
});

// ---- Start -------------------------------------------------
app.listen(PORT, () => {
  console.log(`📡 XenoCRM Channel Service running on port ${PORT}`);
  console.log(`   POST /send → queues callbacks via BullMQ`);
});

// Start BullMQ worker in same process
startWorker();

export default app;
