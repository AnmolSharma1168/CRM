/**
 * XenoCRM Seed Script
 * Generates 200 realistic customers and 500+ orders
 * Run: npm run seed (from apps/backend)
 */

import 'dotenv/config';
import { faker } from '@faker-js/faker';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---- Config -------------------------------------------------
const CUSTOMER_COUNT = 200;
const ORDERS_PER_CUSTOMER_MIN = 1;
const ORDERS_PER_CUSTOMER_MAX = 6;

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat',
  'Lucknow', 'Kanpur', 'Nagpur', 'Bhopal', 'Indore',
];

const CUSTOMER_TAGS = [
  'vip', 'loyal', 'at-risk', 'new', 'high-value',
  'frequent-buyer', 'seasonal', 'dormant', 'premium', 'deal-seeker',
];

const PRODUCT_CATALOG: { name: string; category: string; minPrice: number; maxPrice: number }[] = [
  { name: 'Classic Kurta', category: 'Clothing', minPrice: 799, maxPrice: 2999 },
  { name: 'Silk Saree', category: 'Clothing', minPrice: 3999, maxPrice: 15999 },
  { name: 'Denim Jeans', category: 'Clothing', minPrice: 999, maxPrice: 3999 },
  { name: 'Formal Shirt', category: 'Clothing', minPrice: 699, maxPrice: 2499 },
  { name: 'Running Shoes', category: 'Footwear', minPrice: 1499, maxPrice: 7999 },
  { name: 'Leather Sandals', category: 'Footwear', minPrice: 599, maxPrice: 3499 },
  { name: 'Sports Sneakers', category: 'Footwear', minPrice: 2499, maxPrice: 9999 },
  { name: 'Wireless Earbuds', category: 'Electronics', minPrice: 999, maxPrice: 5999 },
  { name: 'Smartwatch', category: 'Electronics', minPrice: 4999, maxPrice: 24999 },
  { name: 'Phone Case', category: 'Electronics', minPrice: 199, maxPrice: 999 },
  { name: 'Face Serum', category: 'Beauty', minPrice: 499, maxPrice: 2999 },
  { name: 'Perfume Set', category: 'Beauty', minPrice: 1499, maxPrice: 6999 },
  { name: 'Yoga Mat', category: 'Sports', minPrice: 799, maxPrice: 3499 },
  { name: 'Protein Powder', category: 'Health', minPrice: 1299, maxPrice: 4999 },
  { name: 'Coffee Maker', category: 'Home', minPrice: 2999, maxPrice: 12999 },
  { name: 'Scented Candle', category: 'Home', minPrice: 399, maxPrice: 1999 },
  { name: 'Backpack', category: 'Accessories', minPrice: 1299, maxPrice: 5999 },
  { name: 'Sunglasses', category: 'Accessories', minPrice: 499, maxPrice: 4999 },
];

const ORDER_CHANNELS = ['online', 'in-store', 'app', 'phone'] as const;

// ---- Helpers ------------------------------------------------
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTags(): string[] {
  const count = randomInt(1, 3);
  const shuffled = [...CUSTOMER_TAGS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomDateBetween(startDaysAgo: number, endDaysAgo: number): Date {
  const now = new Date();
  const start = new Date(now.getTime() - startDaysAgo * 86400000);
  const end = new Date(now.getTime() - endDaysAgo * 86400000);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// ---- Main ---------------------------------------------------
async function seed() {
  console.log('🌱 Starting XenoCRM seed...\n');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await supabase.from('campaign_stats').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('communications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('campaigns').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('segments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✅ Cleared existing data\n');

  // Generate customers
  console.log(`👥 Generating ${CUSTOMER_COUNT} customers...`);
  
  type CustomerInsert = {
    name: string;
    email: string;
    phone: string;
    city: string;
    tags: string[];
    total_spent: number;
    order_count: number;
    last_order_date: string | null;
  };

  const customerData: CustomerInsert[] = Array.from({ length: CUSTOMER_COUNT }, (_, i) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    // Create varied customer profiles
    const isVIP = i < 20; // first 20 are VIPs
    const isDormant = i >= 160; // last 40 haven't ordered recently

    let lastOrderDate: Date | null;
    if (isDormant) {
      lastOrderDate = randomDateBetween(90, 180); // 3-6 months ago
    } else if (isVIP) {
      lastOrderDate = randomDateBetween(1, 14); // very recent
    } else {
      lastOrderDate = randomDateBetween(2, 60);
    }

    const tags = randomTags();
    if (isVIP) tags.push('vip');
    if (isDormant) tags.push('dormant');

    return {
      name: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      phone: `+91${faker.string.numeric(10)}`,
      city: randomFrom(INDIAN_CITIES),
      tags: [...new Set(tags)],
      total_spent: 0, // will be computed from orders
      order_count: 0,
      last_order_date: lastOrderDate ? lastOrderDate.toISOString().split('T')[0] : null,
    };
  });

  const { data: insertedCustomers, error: custError } = await supabase
    .from('customers')
    .insert(customerData)
    .select('id, last_order_date');

  if (custError) {
    console.error('❌ Error inserting customers:', custError);
    process.exit(1);
  }

  console.log(`✅ Inserted ${insertedCustomers!.length} customers\n`);

  // Generate orders
  console.log('📦 Generating orders...');

  type OrderInsert = {
    customer_id: string;
    amount: number;
    product_name: string;
    category: string;
    order_date: string;
    channel: string;
  };

  const allOrders: OrderInsert[] = [];
  const customerStats: Map<string, { totalSpent: number; orderCount: number }> = new Map();

  for (const customer of insertedCustomers!) {
    const orderCount = randomInt(ORDERS_PER_CUSTOMER_MIN, ORDERS_PER_CUSTOMER_MAX);
    let totalSpent = 0;

    for (let o = 0; o < orderCount; o++) {
      const product = randomFrom(PRODUCT_CATALOG);
      const amount = randomInt(product.minPrice, product.maxPrice);
      
      // Order date: within the last 12 months, but capped at last_order_date for most recent
      let orderDate: Date;
      if (o === 0 && customer.last_order_date) {
        orderDate = new Date(customer.last_order_date);
      } else {
        orderDate = randomDateBetween(365, 0);
      }

      allOrders.push({
        customer_id: customer.id,
        amount,
        product_name: product.name,
        category: product.category,
        order_date: orderDate.toISOString().split('T')[0],
        channel: randomFrom([...ORDER_CHANNELS]),
      });

      totalSpent += amount;
    }

    customerStats.set(customer.id, { totalSpent, orderCount });
  }

  // Batch insert orders in chunks of 100
  const CHUNK_SIZE = 100;
  let ordersInserted = 0;

  for (let i = 0; i < allOrders.length; i += CHUNK_SIZE) {
    const chunk = allOrders.slice(i, i + CHUNK_SIZE);
    const { error: orderError } = await supabase.from('orders').insert(chunk);
    
    if (orderError) {
      console.error(`❌ Error inserting orders chunk ${i / CHUNK_SIZE + 1}:`, orderError);
      process.exit(1);
    }
    ordersInserted += chunk.length;
    process.stdout.write(`\r  → ${ordersInserted}/${allOrders.length} orders inserted...`);
  }

  console.log(`\n✅ Inserted ${ordersInserted} orders\n`);

  // Update customer aggregates (total_spent, order_count)
  console.log('📊 Updating customer aggregates...');
  const updatePromises = Array.from(customerStats.entries()).map(([id, stats]) =>
    supabase.from('customers').update({
      total_spent: stats.totalSpent,
      order_count: stats.orderCount,
    }).eq('id', id)
  );

  await Promise.all(updatePromises);
  console.log('✅ Updated customer aggregates\n');

  // Seed a few example segments
  console.log('🔖 Seeding example segments...');
  const exampleSegments = [
    {
      name: 'High-Value Customers',
      natural_language_query: 'Customers who have spent more than ₹10,000 total',
      sql_filter: 'total_spent > 10000',
      customer_count: 0,
    },
    {
      name: 'Dormant Customers',
      natural_language_query: 'Customers who haven\'t ordered in the last 60 days',
      sql_filter: `last_order_date < CURRENT_DATE - INTERVAL '60 days'`,
      customer_count: 0,
    },
    {
      name: 'Mumbai VIPs',
      natural_language_query: 'VIP customers from Mumbai',
      sql_filter: `city = 'Mumbai' AND 'vip' = ANY(tags)`,
      customer_count: 0,
    },
  ];

  for (const seg of exampleSegments) {
    const { data: countData } = await supabase.rpc('count_segment_query', {
      where_clause: seg.sql_filter,
    });
    seg.customer_count = Number(countData ?? 0);
  }

  const { error: segError } = await supabase.from('segments').insert(exampleSegments);
  if (segError) {
    console.error('❌ Error inserting segments:', segError);
    // Non-fatal — continue
  } else {
    console.log('✅ Seeded example segments\n');
  }

  console.log('🎉 Seed complete!\n');
  console.log('Summary:');
  console.log(`  Customers: ${insertedCustomers!.length}`);
  console.log(`  Orders:    ${ordersInserted}`);
  console.log(`  Segments:  ${exampleSegments.length}`);
}

seed().catch((err) => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
