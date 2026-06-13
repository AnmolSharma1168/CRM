import 'dotenv/config';
import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

import { customersRouter } from './routes/customers';
import { segmentsRouter } from './routes/segments';
import { campaignsRouter } from './routes/campaigns';
import { receiptsRouter } from './routes/receipts';
import { aiRouter } from './routes/ai';
import { operationsRouter } from './routes/operations';
import { errorHandler } from './middleware/errorHandler';
import { supabase } from './db/supabase';

const app = express();
const PORT = process.env.PORT ?? 3001;

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
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ---- Health & Root Routes -----------------------------------
// 1. Root route for deployment platform ping & visibility
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'XenoCRM Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 2. Health check route with database connectivity verification
app.get('/health', async (_req: Request, res: Response) => {
  let dbStatus: 'connected' | 'unknown' = 'connected';
  
  try {
    // Attempt a lightweight read query to verify Supabase database connection health
    const { error } = await supabase.from('customers').select('id').limit(1);
    if (error) {
      console.error('Database connection error in health check:', error);
      dbStatus = 'unknown';
    }
  } catch (err) {
    console.error('Unexpected database check failure:', err);
    dbStatus = 'unknown';
  }

  res.json({
    status: 'healthy',
    database: dbStatus,
    environment: process.env.NODE_ENV ?? 'development'
  });
});

// ---- Routes -------------------------------------------------
app.use('/api/customers', customersRouter);
app.use('/api/segments', segmentsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/receipts', receiptsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/operations', operationsRouter);

// ---- Error handler (must be last) --------------------------
app.use(errorHandler);

// ---- Bootstrap Server ---------------------------------------
const server = app.listen(PORT, () => {
  console.log(`🚀 XenoCRM Backend running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});

// ---- Graceful Shutdown --------------------------------------
const gracefulShutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('HTTP server closed successfully.');
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
