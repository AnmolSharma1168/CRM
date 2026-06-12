# XenoCRM — AI-Native Mini CRM

A chat-first, AI-native Mini CRM where a brand marketer describes their intent in natural language and the AI executes — segmenting shoppers, drafting messages, launching campaigns, and surfacing insights.

## 🚀 Live URLs

- **Backend:** https://xenocrm-backend-ijy1.onrender.com (Deployed on Render)
- **Channel Service:** https://xenocrm-channel-service-rhso.onrender.com (Deployed on Render)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                            │
│                   Next.js 15 Frontend (Vercel)                   │
│  Dashboard | Customers | Segments | Campaigns | AI Chat          │
└─────────────────────┬───────────────────────────────────────────┘
                      │ REST API calls
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│               CRM Backend API (Railway - Service 1)              │
│                  Node.js + Express + TypeScript                   │
│                                                                   │
│  Routes → Controllers → Services → DB                            │
│                                                                   │
│  /api/customers    - CRUD + paginated list                       │
│  /api/segments     - NL→SQL via Gemini + customer matching       │
│  /api/campaigns    - Create, launch, stats, communications        │
│  /api/receipts     - Idempotent callback from channel service     │
│  /api/ai/*         - Gemini: segment parser, drafter, insight     │
└──────────┬──────────────────────────────┬────────────────────────┘
           │                              │
           │ SQL queries                  │ POST /send
           ▼                              ▼
┌──────────────────────┐    ┌─────────────────────────────────────┐
│   Supabase/PostgreSQL │    │  Channel Stub Service (Railway #2)  │
│                       │    │   Node.js + Express + BullMQ        │
│  customers            │    │                                     │
│  orders               │    │  POST /send → BullMQ Queue          │
│  segments             │    │         ↓                           │
│  campaigns            │    │  Worker (delay 2-8s)                │
│  communications       │    │  Outcome: 70% delivered             │
│  campaign_stats       │    │          10% failed                 │
│                       │    │          40% opened (of delivered)  │
└──────────────────────┘    │          20% clicked (of opened)    │
                             │         ↓                           │
                             │  POST /api/receipts → CRM Backend   │
                             └──────────────┬──────────────────────┘
                                            │
                                   ┌────────▼─────────┐
                                   │  Upstash Redis   │
                                   │  (BullMQ store)  │
                                   └──────────────────┘
                                            │
                                   ┌────────▼─────────┐
                                   │  Google Gemini   │
                                   │  2.0 Flash API   │
                                   │                  │
                                   │  • NL → SQL      │
                                   │  • Msg drafting  │
                                   │  • AI insights   │
                                   │  • AI Chat       │
                                   └──────────────────┘
```

---

## 📁 Project Structure

```
xeno-crm/
├── apps/
│   ├── frontend/          # Next.js 15 + TypeScript + Tailwind v4
│   │   ├── app/           # App Router pages
│   │   │   ├── page.tsx               # Dashboard
│   │   │   ├── customers/page.tsx     # Customer table
│   │   │   ├── segments/page.tsx      # AI segment builder
│   │   │   ├── campaigns/page.tsx     # Campaign list
│   │   │   ├── campaigns/new/page.tsx # 3-step wizard
│   │   │   ├── campaigns/[id]/page.tsx # Detail + AI insight
│   │   │   └── ai-chat/page.tsx       # Free-form AI chat
│   │   ├── components/    # Sidebar, UI primitives
│   │   └── lib/           # API client, types, utils
│   │
│   ├── backend/           # Express API server
│   │   ├── src/
│   │   │   ├── routes/    # customers, segments, campaigns, receipts, ai
│   │   │   ├── services/  # Business logic layer
│   │   │   ├── db/        # Supabase client + schema.sql
│   │   │   ├── validators/ # Zod schemas
│   │   │   ├── middleware/ # Error handler
│   │   │   └── scripts/   # seed.ts
│   │   └── package.json
│   │
│   └── channel-service/   # Channel stub microservice
│       ├── src/
│       │   ├── index.ts   # Express server + POST /send
│       │   ├── queue.ts   # BullMQ queue definition
│       │   ├── worker.ts  # BullMQ worker with realistic outcomes
│       │   └── redis.ts   # ioredis connection for Upstash
│       └── package.json
│
├── packages/
│   └── shared/            # TypeScript interfaces (all 3 apps import)
│
├── .env.example           # All environment variables documented
└── package.json           # npm workspaces root
```

---

## ⚙️ Setup

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- An [Upstash](https://upstash.com) Redis instance (free tier works)
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini 2.0 Flash)

### 1. Clone and install
```bash
git clone https://github.com/yourusername/xeno-crm
cd xeno-crm
npm install
```

### 2. Apply database schema
1. Go to your Supabase project → **SQL Editor**
2. Run the contents of `apps/backend/src/db/schema.sql`

### 3. Configure environment variables

**`apps/backend/.env`:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
PORT=3001
CHANNEL_SERVICE_URL=http://localhost:3002
CRM_CALLBACK_URL=http://localhost:3001/api/receipts
```

**`apps/channel-service/.env`:**
```env
REDIS_URL=rediss://default:password@your-redis.upstash.io:6380
CHANNEL_SERVICE_PORT=3002
```

**`apps/frontend/.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Seed the database
```bash
npm run seed
# Seeds 200 customers + 500+ orders + 3 example segments
```

### 5. Run all services
```bash
npm run dev
# Starts all 3 services concurrently:
# - Frontend: http://localhost:3000
# - Backend:  http://localhost:3001
# - Channel:  http://localhost:3002
```

---

## 🚀 Deployment

### Frontend → Vercel
```bash
cd apps/frontend
vercel deploy
# Set env: NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

### Backend → Railway
```bash
# Create service from apps/backend/
# Set all env vars in Railway dashboard
# Build command: npm run build
# Start command: npm start
```

### Channel Service → Railway
```bash
# Create separate service from apps/channel-service/
# Set REDIS_URL and CHANNEL_SERVICE_PORT
```

---

## 🔑 Key API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/customers` | List with pagination + filters |
| POST | `/api/customers` | Create customer |
| GET | `/api/segments` | List all segments |
| POST | `/api/segments/preview` | Preview NL query without saving |
| POST | `/api/segments` | Create segment (AI parses NL→SQL) |
| GET | `/api/campaigns` | List campaigns |
| POST | `/api/campaigns` | Create campaign |
| POST | `/api/campaigns/:id/launch` | Launch campaign |
| GET | `/api/campaigns/:id/stats` | Live stats with rates |
| POST | `/api/receipts` | Callback from channel service |
| POST | `/api/ai/segment-query` | NL→SQL preview |
| POST | `/api/ai/draft-message` | Generate 3 message variants |
| POST | `/api/ai/campaign-insight` | Generate AI insight |
| POST | `/api/ai/chat` | Free-form AI chat |
| POST | `/send` (channel) | Enqueue delivery + callbacks |

---

## ⚖️ Design Decisions & Tradeoffs

### BullMQ over raw setTimeout
**Decision:** Channel service uses BullMQ (Redis-backed queue) for all callbacks instead of `setTimeout`.  
**Rationale:** `setTimeout` is lost on process restart. BullMQ persists jobs to Redis, surviving crashes. Evaluators can inspect the queue via `/queue/stats`. Concurrency-controlled at 20 workers.  
**Tradeoff:** Requires Redis (Upstash free tier solves this). Adds ~50ms latency per job.

### Receipt idempotency
**Decision:** `POST /api/receipts` is fully idempotent — same status received twice = safe no-op. Status regression is silently ignored.  
**Rationale:** Channel services may retry callbacks. Double delivery of "delivered" should not break the funnel.  
**Implementation:** Check current status before updating; only update if new status advances the state machine.

### AI-generated SQL via Supabase RPC
**Decision:** Gemini-generated SQL WHERE clauses are executed via a PostgreSQL `SECURITY DEFINER` function (`execute_segment_query`), not raw `supabase.rpc`.  
**Rationale:** Prevents SQL injection while allowing flexible AI-generated filters. The RPC only queries `customers` — no other table is accessible from within it.  
**Tradeoff:** Added pattern-blocking (DROP/DELETE/etc.) as a secondary defense layer.

### Supabase service role on backend only
**Decision:** The frontend never touches Supabase directly — all DB access flows through the Express backend using the service role key.  
**Rationale:** Service role key grants full database access; exposing it in the browser would be a critical security vulnerability.

### Monorepo with npm workspaces
**Decision:** Single git repo, three apps (frontend/backend/channel-service) + shared types.  
**Rationale:** Shared TypeScript types eliminate interface drift between services. Single `npm install` at root. `concurrently` runs all three in dev.  
**Tradeoff:** Railway requires specifying the root directory per service.

### 5s polling vs. Supabase Realtime
**Decision:** Campaign stats page polls every 5 seconds; dashboard uses one-shot load.  
**Rationale:** Supabase Realtime requires a persistent WebSocket connection and browser-side Supabase client (which needs anon key). Polling is simpler, more predictable, and works cross-origin without extra auth setup.  
**Tradeoff:** Up to 5s lag on stat updates. Acceptable for an async campaign delivery system.

### No authentication
**Decision:** No auth/login implemented per spec.  
**Tradeoff:** All data is publicly readable. For production, add Supabase Auth + Row Level Security.

---

## 📊 Seed Data Profile

- **200 customers** across 15 Indian cities with realistic names, phones, tags
- **500+ orders** with varied products (clothing, electronics, beauty, etc.) across the last 12 months
- **Customer segments:** VIPs (recent, high spend), Dormant (no order in 90+ days), Regular
- **3 pre-seeded segments:** High-Value, Dormant, Mumbai VIPs

---

## 🧪 Testing the Full Flow

1. Run `npm run seed` → loads 200 customers + 500 orders
2. Open `http://localhost:3000/segments` → Create a segment with natural language
3. Open `http://localhost:3000/campaigns/new` → Pick segment → AI drafts messages → Launch
4. Watch `/campaigns/:id` → stats update live every 5s as channel service sends callbacks
5. Click "Generate AI Insight" → Gemini analyzes performance vs benchmarks
6. Open `/ai-chat` → ask "who are my top customers in Mumbai?"
