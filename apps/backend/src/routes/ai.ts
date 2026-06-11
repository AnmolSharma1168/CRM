import { Router, Request, Response } from 'express';
import {
  SegmentQuerySchema,
  DraftMessageSchema,
  CampaignInsightSchema,
  CampaignStrategyInputSchema,
  SaveStrategyInputSchema
} from '../validators/schemas';
import { z } from 'zod';
import * as aiService from '../services/aiService';
import { previewSegmentQuery } from '../services/segmentService';
import * as strategistService from '../services/strategistService';

export const aiRouter = Router();

// POST /api/ai/segment-query — NL → SQL (preview only)
aiRouter.post('/segment-query', async (req: Request, res: Response) => {
  const { natural_language_query } = SegmentQuerySchema.parse(req.body);
  const result = await previewSegmentQuery(natural_language_query);
  res.json({ success: true, data: result });
});

// POST /api/ai/draft-message — generate 3 message variants
aiRouter.post('/draft-message', async (req: Request, res: Response) => {
  const input = DraftMessageSchema.parse(req.body);
  const variants = await aiService.draftMessages(input);
  res.json({ success: true, data: variants });
});

// POST /api/ai/campaign-insight — generate insight for completed campaign
aiRouter.post('/campaign-insight', async (req: Request, res: Response) => {
  const { campaign_id } = CampaignInsightSchema.parse(req.body);
  const insight = await aiService.generateCampaignInsight(campaign_id);
  res.json({ success: true, data: insight });
});

// POST /api/ai/campaign-strategy — generate complete strategized campaign
aiRouter.post('/campaign-strategy', async (req: Request, res: Response) => {
  const { goal } = CampaignStrategyInputSchema.parse(req.body);
  const strategy = await strategistService.generateCampaignStrategy(goal);
  res.json({ success: true, data: strategy });
});

// POST /api/ai/campaign-strategy/save — save generated campaign and segment
aiRouter.post('/campaign-strategy/save', async (req: Request, res: Response) => {
  const input = SaveStrategyInputSchema.parse(req.body);
  const campaign = await strategistService.saveCampaignFromStrategy(input);
  res.status(201).json({ success: true, data: campaign });
});

// POST /api/ai/chat — free-form AI chat
const ChatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string().min(1),
  })).min(1),
});

aiRouter.post('/chat', async (req: Request, res: Response) => {
  const { messages } = ChatSchema.parse(req.body);
  const response = await aiService.chatWithAI(messages);
  res.json({ success: true, data: { response } });
});

