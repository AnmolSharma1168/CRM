import 'dotenv/config';
import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { callbackQueue } from './queue';
import { startWorker } from './worker';
import type { CallbackJobData } from './queue';
import { IS_MOCK_REDIS } from './redis';

const app = express();
const PORT = process.env.CHANNEL_SERVICE_PORT ?? process.env.PORT ?? 3002;

// ---- Production & Security Settings -------------------------
// Trust proxy is required when running behind load balancers like Render/Vercel
// to resolve client IPs correctly via X-Forwarded-For headers
app.set('trust proxy', 1);

// Disable X-Powered-By to prevent exposing technology stack details
app.disable('x-powered-by');

// Custom security headers middleware (lightweight alternative to helmet)
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// ---- Request Logger Middleware ------------------------------
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ---- Middleware ---------------------------------------------
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

// ---- Health & Root Routes -----------------------------------
// 1. Root route for deployment platform ping & visibility
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'XenoCRM Channel Service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 2. Health check route with database (Redis) connectivity verification
app.get('/health', async (_req: Request, res: Response) => {
  let dbStatus: 'connected' | 'unknown' = 'connected';

  if (!IS_MOCK_REDIS) {
    try {
      const client = await callbackQueue.client;
      const pingRes = await client.ping();
      if (pingRes !== 'PONG') {
        dbStatus = 'unknown';
      }
    } catch (err) {
      console.error('Redis connection check failed in health check:', err);
      dbStatus = 'unknown';
    }
  }

  res.json({
    status: 'healthy',
    database: dbStatus,
    environment: process.env.NODE_ENV ?? 'development'
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
const server = app.listen(PORT, () => {
  console.log(`📡 XenoCRM Channel Service running on port ${PORT}`);
  console.log(`   POST /send → queues callbacks via BullMQ`);
});

// Start BullMQ worker in same process
const worker = startWorker();

// ---- Graceful Shutdown --------------------------------------
const gracefulShutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown for Channel Service...`);
  
  server.close(async () => {
    console.log('HTTP server closed successfully.');
    
    // Gracefully shut down BullMQ worker if applicable
    if (worker && typeof worker.close === 'function') {
      try {
        console.log('Closing BullMQ worker...');
        await worker.close();
        console.log('BullMQ worker closed.');
      } catch (err) {
        console.error('Error closing BullMQ worker:', err);
      }
    }

    // Gracefully shut down BullMQ queue connection
    if (callbackQueue && typeof callbackQueue.close === 'function') {
      try {
        console.log('Closing BullMQ queue client...');
        await callbackQueue.close();
        console.log('BullMQ queue client closed.');
      } catch (err) {
        console.error('Error closing BullMQ queue:', err);
      }
    }
    
    process.exit(0);
  });

  // Force close after 10 seconds if connections fail to close
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
