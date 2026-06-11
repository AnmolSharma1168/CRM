import { Router, Request, Response } from 'express';
import { CreateCampaignSchema } from '../validators/schemas';
import * as campaignService from '../services/campaignService';

export const campaignsRouter = Router();

// GET /api/campaigns
campaignsRouter.get('/', async (_req: Request, res: Response) => {
  const campaigns = await campaignService.listCampaigns();
  res.json({ success: true, data: campaigns });
});

// GET /api/campaigns/:id
campaignsRouter.get('/:id', async (req: Request, res: Response) => {
  const campaign = await campaignService.getCampaignById(String(req.params.id));
  res.json({ success: true, data: campaign });
});

// GET /api/campaigns/:id/stats
campaignsRouter.get('/:id/stats', async (req: Request, res: Response) => {
  const stats = await campaignService.getCampaignStats(String(req.params.id));
  res.json({ success: true, data: stats });
});

// GET /api/campaigns/:id/communications
campaignsRouter.get('/:id/communications', async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page ?? '1'));
  const pageSize = parseInt(String(req.query.pageSize ?? '50'));
  const result = await campaignService.getCampaignCommunications(String(req.params.id), page, pageSize);
  res.json({ success: true, data: result.data, total: result.total });
});

// POST /api/campaigns
campaignsRouter.post('/', async (req: Request, res: Response) => {
  const input = CreateCampaignSchema.parse(req.body);
  const campaign = await campaignService.createCampaign(input);
  res.status(201).json({ success: true, data: campaign });
});

// POST /api/campaigns/:id/launch
campaignsRouter.post('/:id/launch', async (req: Request, res: Response) => {
  const result = await campaignService.launchCampaign(String(req.params.id));
  res.json({ success: true, data: result, message: `Campaign launched — ${result.sent} messages queued` });
});
