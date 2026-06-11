import { supabase } from '../db/supabase';
import { createError } from '../middleware/errorHandler';
import { parseSegmentQuery } from './aiService';
import type { Segment } from '@xeno-crm/shared';

// ---- Helper: count customers matching a SQL filter ----------
// Uses execute_segment_query (count_segment_query has a DB-side bug)
async function countByFilter(sqlFilter: string): Promise<number> {
  const { data, error } = await supabase.rpc('execute_segment_query', {
    where_clause: sqlFilter,
  });
  if (error) throw createError(`SQL execution failed: ${error.message}`, 400);
  return Array.isArray(data) ? data.length : 0;
}

// ---- List all segments --------------------------------------
export async function listSegments(): Promise<Segment[]> {
  const { data, error } = await supabase
    .from('segments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw createError(error.message, 500);
  return (data ?? []) as Segment[];
}

// ---- Preview a NL query without saving ----------------------
export async function previewSegmentQuery(naturalLanguageQuery: string): Promise<{
  sqlFilter: string;
  explanation: string;
  estimatedCount: number;
  previewCustomers: unknown[];
}> {
  const { sqlFilter, explanation } = await parseSegmentQuery(naturalLanguageQuery);

  // Get matching customers (also used for count)
  const { data: previewData, error: previewError } = await supabase.rpc('execute_segment_query', {
    where_clause: sqlFilter,
  });

  if (previewError) {
    throw createError(`SQL execution failed: ${previewError.message}`, 400);
  }

  const allRows = previewData ?? [];

  return {
    sqlFilter,
    explanation,
    estimatedCount: allRows.length,
    previewCustomers: allRows.slice(0, 5),
  };
}

// ---- Create a segment ---------------------------------------
export async function createSegment(
  name: string,
  naturalLanguageQuery: string
): Promise<Segment> {
  const { sqlFilter } = await parseSegmentQuery(naturalLanguageQuery);

  // Count matching customers via execute_segment_query
  const customerCount = await countByFilter(sqlFilter);

  const { data, error } = await supabase
    .from('segments')
    .insert({
      name,
      natural_language_query: naturalLanguageQuery,
      sql_filter: sqlFilter,
      customer_count: customerCount,
    })
    .select()
    .single();

  if (error) throw createError(error.message, 500);

  return data as Segment;
}

// ---- Get segment by id + its customers ----------------------
export async function getSegmentWithCustomers(id: string): Promise<{
  segment: Segment;
  customers: unknown[];
}> {
  const { data: segment, error: segError } = await supabase
    .from('segments')
    .select('*')
    .eq('id', id)
    .single();

  if (segError || !segment) throw createError('Segment not found', 404);

  const { data: customers, error: custError } = await supabase.rpc('execute_segment_query', {
    where_clause: (segment as Segment).sql_filter,
  });

  if (custError) throw createError(custError.message, 500);

  return {
    segment: segment as Segment,
    customers: customers ?? [],
  };
}
