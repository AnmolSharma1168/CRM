import { Router, Request, Response } from 'express';
import { CreateCustomerSchema, CustomerQuerySchema, CreateOrderSchema } from '../validators/schemas';
import * as customerService from '../services/customerService';
import { supabase } from '../db/supabase';
import { createError } from '../middleware/errorHandler';

export const customersRouter = Router();

// GET /api/customers
customersRouter.get('/', async (req: Request, res: Response) => {
  const query = CustomerQuerySchema.parse(req.query);
  const result = await customerService.listCustomers(query);
  res.json(result);
});

// GET /api/customers/cities
customersRouter.get('/cities', async (_req: Request, res: Response) => {
  const cities = await customerService.getDistinctCities();
  res.json({ success: true, data: cities });
});

// GET /api/customers/:id
customersRouter.get('/:id', async (req: Request, res: Response) => {
  const customer = await customerService.getCustomerById(String(req.params.id));
  res.json({ success: true, data: customer });
});

// GET /api/customers/:id/orders
customersRouter.get('/:id/orders', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', String(req.params.id))
    .order('order_date', { ascending: false });

  if (error) throw createError(error.message, 500);
  res.json({ success: true, data: data ?? [] });
});

// POST /api/customers
customersRouter.post('/', async (req: Request, res: Response) => {
  const input = CreateCustomerSchema.parse(req.body);
  const customer = await customerService.createCustomer(input);
  res.status(201).json({ success: true, data: customer });
});

// POST /api/orders
customersRouter.post('/orders', async (req: Request, res: Response) => {
  const input = CreateOrderSchema.parse(req.body);
  const { data, error } = await supabase
    .from('orders')
    .insert(input)
    .select()
    .single();

  if (error) throw createError(error.message, 500);

  // Update customer aggregate
  await supabase.rpc('refresh_customer_aggregate' as never, { p_customer_id: input.customer_id });
  res.status(201).json({ success: true, data });
});
