import { Router, Request, Response } from 'express';
import { CreateSegmentSchema, SegmentQuerySchema } from '../validators/schemas';
import * as segmentService from '../services/segmentService';

export const segmentsRouter = Router();

// GET /api/segments
segmentsRouter.get('/', async (_req: Request, res: Response) => {
  const segments = await segmentService.listSegments();
  res.json({ success: true, data: segments });
});

// GET /api/segments/:id
segmentsRouter.get('/:id', async (req: Request, res: Response) => {
  const result = await segmentService.getSegmentWithCustomers(String(req.params.id));
  res.json({ success: true, data: result });
});

// POST /api/segments/preview — preview NL query without saving
segmentsRouter.post('/preview', async (req: Request, res: Response) => {
  const { natural_language_query } = SegmentQuerySchema.parse(req.body);
  const result = await segmentService.previewSegmentQuery(natural_language_query);
  res.json({ success: true, data: result });
});

// POST /api/segments — create segment
segmentsRouter.post('/', async (req: Request, res: Response) => {
  const { name, natural_language_query } = CreateSegmentSchema.parse(req.body);
  const segment = await segmentService.createSegment(name, natural_language_query);
  res.status(201).json({ success: true, data: segment });
});
