import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';

import { customersRouter } from './routes/customers';
import { segmentsRouter } from './routes/segments';
import { campaignsRouter } from './routes/campaigns';
import { receiptsRouter } from './routes/receipts';
import { aiRouter } from './routes/ai';
import { operationsRouter } from './routes/operations';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT ?? 3001;

// ---- Middleware ---------------------------------------------
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ---- Health -------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', service: 'xeno-crm-backend', ts: new Date().toISOString() } });
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

app.listen(PORT, () => {
  console.log(`🚀 XenoCRM Backend running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});

export default app;
