import { supabase } from '../db/supabase';
import { createError } from '../middleware/errorHandler';
import type { Customer, PaginatedResponse } from '@xeno-crm/shared';
import { z } from 'zod';
import { CreateCustomerSchema, CustomerQuerySchema } from '../validators/schemas';

type CustomerQuery = z.infer<typeof CustomerQuerySchema>;
type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

export async function listCustomers(query: CustomerQuery): Promise<PaginatedResponse<Customer>> {
  const { page, pageSize, search, city, tag, minSpent, maxSpent } = query;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let dbQuery = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search) {
    dbQuery = dbQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }
  if (city) {
    dbQuery = dbQuery.eq('city', city);
  }
  if (tag) {
    dbQuery = dbQuery.contains('tags', [tag]);
  }
  if (minSpent !== undefined) {
    dbQuery = dbQuery.gte('total_spent', minSpent);
  }
  if (maxSpent !== undefined) {
    dbQuery = dbQuery.lte('total_spent', maxSpent);
  }

  const { data, error, count } = await dbQuery.range(from, to);

  if (error) throw createError(error.message, 500);

  return {
    success: true,
    data: (data ?? []) as Customer[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert({ ...input, total_spent: 0, order_count: 0 })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw createError('Email already exists', 409);
    throw createError(error.message, 500);
  }

  return data as Customer;
}

export async function getCustomerById(id: string): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) throw createError('Customer not found', 404);
  return data as Customer;
}

export async function getDistinctCities(): Promise<string[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('city')
    .order('city');

  if (error) throw createError(error.message, 500);
  const cities = [...new Set((data ?? []).map((r: { city: string }) => r.city))];
  return cities;
}
