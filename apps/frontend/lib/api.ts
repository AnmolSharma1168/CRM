const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  const json = await res.json();

  if (!res.ok || json.success === false) {
    throw new Error(json.error ?? `API error: ${res.status}`);
  }

  return json;
}

// ---- Customers ---------------------------------------------
export const api = {
  customers: {
    list: (params?: Record<string, string | number>) => {
      const qs = params ? '?' + new URLSearchParams(
        Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
      ).toString() : '';
      return apiFetch<{ success: boolean; data: unknown[]; total: number }>(`/api/customers${qs}`);
    },
    get: (id: string) => apiFetch<{ success: boolean; data: unknown }>(`/api/customers/${id}`),
    orders: (id: string) => apiFetch<{ success: boolean; data: unknown[] }>(`/api/customers/${id}/orders`),
    cities: () => apiFetch<{ success: boolean; data: string[] }>(`/api/customers/cities`),
    create: (body: unknown) => apiFetch<{ success: boolean; data: unknown }>(`/api/customers`, {
      method: 'POST', body: JSON.stringify(body),
    }),
  },

  segments: {
    list: () => apiFetch<{ success: boolean; data: unknown[] }>(`/api/segments`),
    get: (id: string) => apiFetch<{ success: boolean; data: unknown }>(`/api/segments/${id}`),
    preview: (natural_language_query: string) =>
      apiFetch<{ success: boolean; data: unknown }>(`/api/segments/preview`, {
        method: 'POST', body: JSON.stringify({ natural_language_query }),
      }),
    create: (body: { name: string; natural_language_query: string }) =>
      apiFetch<{ success: boolean; data: unknown }>(`/api/segments`, {
        method: 'POST', body: JSON.stringify(body),
      }),
  },

  campaigns: {
    list: () => apiFetch<{ success: boolean; data: unknown[] }>(`/api/campaigns`),
    get: (id: string) => apiFetch<{ success: boolean; data: unknown }>(`/api/campaigns/${id}`),
    stats: (id: string) => apiFetch<{ success: boolean; data: unknown }>(`/api/campaigns/${id}/stats`),
    communications: (id: string, page = 1) =>
      apiFetch<{ success: boolean; data: unknown[]; total: number }>(`/api/campaigns/${id}/communications?page=${page}`),
    create: (body: unknown) => apiFetch<{ success: boolean; data: unknown }>(`/api/campaigns`, {
      method: 'POST', body: JSON.stringify(body),
    }),
    launch: (id: string) => apiFetch<{ success: boolean; data: unknown }>(`/api/campaigns/${id}/launch`, {
      method: 'POST',
    }),
  },

  ai: {
    segmentQuery: (natural_language_query: string) =>
      apiFetch<{ success: boolean; data: unknown }>(`/api/ai/segment-query`, {
        method: 'POST', body: JSON.stringify({ natural_language_query }),
      }),
    draftMessage: (body: unknown) =>
      apiFetch<{ success: boolean; data: unknown[] }>(`/api/ai/draft-message`, {
        method: 'POST', body: JSON.stringify(body),
      }),
    campaignInsight: (campaign_id: string) =>
      apiFetch<{ success: boolean; data: unknown }>(`/api/ai/campaign-insight`, {
        method: 'POST', body: JSON.stringify({ campaign_id }),
      }),
    chat: (messages: { role: string; content: string }[]) =>
      apiFetch<{ success: boolean; data: { response: string } }>(`/api/ai/chat`, {
        method: 'POST', body: JSON.stringify({ messages }),
      }),
  },
};
