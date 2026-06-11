import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase';
import axios from 'axios';

export const operationsRouter = Router();

const CHANNEL_SERVICE_URL = process.env.CHANNEL_SERVICE_URL ?? 'http://localhost:3002';

// GET /api/operations/metrics
operationsRouter.get('/metrics', async (_req: Request, res: Response) => {
  // 1. Get active campaigns count from Supabase
  const { count: activeCampaignsCount, error: countError } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'running');

  if (countError) {
    console.error('Failed to get active campaigns count:', countError.message);
  }

  // 2. Fetch queue stats from Channel Service
  let queueStats = {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    avgLatencyMs: 0,
    failedJobsCount: 0,
    retryCount: 0,
    callbackFailuresCount: 0,
    health: 'offline',
  };

  try {
    const channelRes = await axios.get(`${CHANNEL_SERVICE_URL}/queue/stats`, { timeout: 3000 });
    if (channelRes.data && channelRes.data.success) {
      queueStats = {
        ...channelRes.data.data,
        health: 'healthy',
      };
    }
  } catch (err: any) {
    console.error('Failed to connect to channel service:', err.message);
  }

  res.json({
    success: true,
    data: {
      activeCampaigns: activeCampaignsCount ?? 0,
      queueSize: queueStats.waiting + queueStats.active,
      waitingJobs: queueStats.waiting,
      activeJobs: queueStats.active,
      completedJobs: queueStats.completed,
      failedJobs: queueStats.failed,
      avgLatencyMs: queueStats.avgLatencyMs,
      failedJobsCount: queueStats.failedJobsCount,
      retryCount: queueStats.retryCount,
      callbackFailures: queueStats.callbackFailuresCount,
      channelHealth: queueStats.health,
    },
  });
});
