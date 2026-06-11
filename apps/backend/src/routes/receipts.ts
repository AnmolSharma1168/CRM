import { Router, Request, Response } from 'express';
import { ReceiptSchema } from '../validators/schemas';
import { processReceipt } from '../services/receiptService';

export const receiptsRouter = Router();

// POST /api/receipts — called by channel service
receiptsRouter.post('/', async (req: Request, res: Response) => {
  const payload = ReceiptSchema.parse(req.body);
  const result = await processReceipt(payload);
  res.json({ success: true, data: result });
});
