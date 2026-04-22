// frontend/src/lib/api.ts
// Central API client that talks to the Express + MongoDB backend.
// All data access goes through this module — no direct DB calls from the frontend.

/** Avoid `https://host/api` + `/api/roles` → `/api/api/roles` (404 on the server). */
function normalizeApiBaseUrl(base: string): string {
  let b = (base || "").trim();
  if (!b) return b;
  b = b.replace(/\/+$/, "");
  if (b.endsWith("/api")) {
    b = b.slice(0, -4).replace(/\/+$/, "");
  }
  return b;
}

const BASE_URL = normalizeApiBaseUrl(
  import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? "http://localhost:3001" : "https://kpiadscroll360.onrender.com")
);

async function request<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // Try to get companyId from localStorage session
  let companyId: string | null = null;
  try {
    const saved = localStorage.getItem('zaptiz_session_v1') || localStorage.getItem('adscroll360_session_v4');
    if (saved) {
      const user = JSON.parse(saved);
      companyId = user.companyId || null;
    }
  } catch {}

  const headers: Record<string, string> = { 
    'Content-Type': 'application/json', 
    ...((options.headers as any) || {})
  };

  // Auto-inject companyId into GET query params if not already there
  let finalPath = path;
  if (companyId && !path.includes('companyId=') && !path.includes('/api/super-admin/')) {
    const separator = path.includes('?') ? '&' : '?';
    finalPath = `${path}${separator}companyId=${companyId}`;
  }

  // Auto-inject companyId into POST/PATCH/DELETE bodies if not already there
  let finalOptions = { ...options, headers };
  if (companyId && ['POST', 'PATCH', 'DELETE'].includes(options.method || 'GET') && !path.includes('/api/super-admin/')) {
    try {
      if (options.body && typeof options.body === 'string') {
        const body = JSON.parse(options.body);
        if (!body.companyId) {
          body.companyId = companyId;
          finalOptions.body = JSON.stringify(body);
        }
      } else if (!options.body && options.method !== 'DELETE') {
         finalOptions.body = JSON.stringify({ companyId });
      }
    } catch {}
  }

  const res = await fetch(`${BASE_URL}${finalPath}`, finalOptions);

  const json = await res.json().catch(() => ({ error: res.statusText }));

  if (!res.ok) {
    throw new Error(json?.error || `Request failed: ${res.status}`);
  }

  return json as T;
}

// ── Users ──────────────────────────────────────────────────
export const api = {
  users: {
    list: (companyId: string)                     => request<{ users: any[] }>(`/api/users?companyId=${companyId}`),
    get:  (id: string)                            => request<{ user: any }>(`/api/users/${id}`),
    login: (email: string, password: string)      => request<{ user: any }>('/api/users/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    create: (data: Record<string, unknown>)       => request<{ user: any }>('/api/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) => request<{ user: any }>(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string)                          => request(`/api/users/${id}`, { method: 'DELETE' }),
  },

  tasks: {
    list:       (companyId: string)                                   => request<{ tasks: any[] }>(`/api/tasks?companyId=${companyId}`),
    analytics:  (params: Record<string, string>)                      => request<any>(`/api/tasks/analytics?${new URLSearchParams(params)}`),
    create:     (data: Record<string, unknown>)                       => request<{ task: any }>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
    setStatus:  (id: string, status: string, actorId?: string, actorName?: string) =>
      request<{ task: any }>(`/api/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, actorId, actorName }) }),
    submit:     (id: string, sub: Record<string, unknown>)            => request<{ task: any }>(`/api/tasks/${id}/submission`, { method: 'PATCH', body: JSON.stringify(sub) }),
    addMessage: (id: string, msg: Record<string, unknown>)            => request<{ task: any }>(`/api/tasks/${id}/messages`, { method: 'POST', body: JSON.stringify(msg) }),
    patch:      (id: string, data: Record<string, unknown>)          => request<{ task: any }>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove:     (id: string, companyId: string)                        =>
      request(`/api/tasks/${id}?companyId=${encodeURIComponent(companyId)}`, { method: 'DELETE' }),
  },

  attendance: {
    list:     (companyId: string)                             => request<{ records: any[] }>(`/api/attendance?companyId=${companyId}`),
    checkin:  (data: Record<string, unknown>)                 => request<{ record: any }>('/api/attendance/checkin', { method: 'POST', body: JSON.stringify(data) }),
    checkout: (id: string, checkOutTime: string)              => request<{ record: any }>(`/api/attendance/${id}/checkout`, { method: 'PATCH', body: JSON.stringify({ checkOutTime }) }),
    update:   (id: string, data: Record<string, unknown>)     => request<{ record: any }>(`/api/attendance/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    upsert:   (data: Record<string, unknown>)                 => request<{ record: any }>('/api/attendance/upsert', { method: 'POST', body: JSON.stringify(data) }),
    breaks: {
      list:   (companyId: string)                             => request<{ breakRequests: any[] }>(`/api/attendance/breaks?companyId=${companyId}`),
      create: (data: Record<string, unknown>)                 => request<{ breakRequest: any }>('/api/attendance/breaks', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, status: string)                    => request<{ breakRequest: any }>(`/api/attendance/breaks/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    },
  },

  kpis: {
    list:           (companyId: string, actorUserId: string)  => request<{ kpis: any[] }>(`/api/kpis?companyId=${companyId}&actorUserId=${encodeURIComponent(actorUserId)}`),
    create:         (data: Record<string, unknown>)           => request<{ kpi: any }>('/api/kpis', { method: 'POST', body: JSON.stringify(data) }),
    updateProgress: (id: string, current: number, companyId: string, actorUserId: string) =>
      request<{ kpi: any }>(`/api/kpis/${id}/progress`, { method: 'PATCH', body: JSON.stringify({ current, companyId, actorUserId }) }),
    remove:         (id: string, companyId: string, actorUserId: string) =>
      request(`/api/kpis/${id}?companyId=${encodeURIComponent(companyId)}&actorUserId=${encodeURIComponent(actorUserId)}`, { method: 'DELETE' }),
  },

  superAdmin: {
    login: (email: string, password: string)                  => request<{ user: any }>('/api/super-admin/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    stats: ()                                                 => request<any>('/api/super-admin/stats'),
    companies: {
      list:       ()                                          => request<{ companies: any[] }>('/api/super-admin/companies'),
      get:        (id: string)                                => request<any>(`/api/super-admin/companies/${id}`),
      create:     (data: Record<string, unknown>)             => request<{ company: any }>('/api/super-admin/companies', { method: 'POST', body: JSON.stringify(data) }),
      update:     (id: string, data: Record<string, unknown>) => request<{ company: any }>(`/api/super-admin/companies/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      resetAdmin: (id: string, newPassword: string)           => request<any>(`/api/super-admin/companies/${id}/reset-admin`, { method: 'POST', body: JSON.stringify({ newPassword }) }),
      remove:     (id: string)                                => request(`/api/super-admin/companies/${id}`, { method: 'DELETE' }),
    },
  },

  notifications: {
    list:   (companyId: string, userId: string)      => request<{ notifications: any[]; unreadCount: number }>(`/api/notifications?companyId=${companyId}&userId=${encodeURIComponent(userId)}`),
    create: (data: Record<string, unknown>)         => request<{ notification: any }>('/api/notifications', { method: 'POST', body: JSON.stringify(data) }),
    markRead: (id: string, data: Record<string, unknown>) => request<{ notification: any }>(`/api/notifications/${id}/read`, { method: 'PATCH', body: JSON.stringify(data) }),
    markAllRead: (data: Record<string, unknown>) => request('/api/notifications/read-all', { method: 'POST', body: JSON.stringify(data) }),
    clearAll: (companyId: string) => request(`/api/notifications/clear-all?companyId=${encodeURIComponent(companyId)}`, { method: 'DELETE' }),
  },

  roles: {
    list:   (companyId: string)                      => request<{ roles: any[] }>(`/api/roles?companyId=${companyId}`),
    create: (data: Record<string, unknown>)         => request<{ role: any }>('/api/roles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) => request<{ role: any }>(`/api/roles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string, companyId: string)          =>
      request(`/api/roles/${id}?companyId=${encodeURIComponent(companyId)}`, { method: 'DELETE' }),
  },

  standups: {
    list:   (params: Record<string, string>)        => request<{ standups: any[] }>(`/api/standups?${new URLSearchParams(params).toString()}`),
    create: (data: Record<string, unknown>)         => request<{ standup: any }>('/api/standups', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) => request<{ standup: any }>(`/api/standups/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string, companyId: string)       =>
      request(`/api/standups/${id}?companyId=${encodeURIComponent(companyId)}`, { method: 'DELETE' }),
  },

  notes: {
    list:   (params: Record<string, string>)        => request<{ notes: any[] }>(`/api/notes?${new URLSearchParams(params).toString()}`),
    create: (data: Record<string, unknown>)         => request<{ note: any }>('/api/notes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) => request<{ note: any }>(`/api/notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string, params: { companyId: string; userId: string }) =>
      request(`/api/notes/${id}?${new URLSearchParams(params).toString()}`, { method: 'DELETE' }),
  },

  skills: {
    list:   (companyId: string)                     => request<{ skills: any[] }>(`/api/skills?companyId=${companyId}`),
    create: (data: Record<string, unknown>)       => request<{ skill: any }>('/api/skills', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) => request<{ skill: any }>(`/api/skills/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string, companyId: string)       =>
      request(`/api/skills/${id}?companyId=${encodeURIComponent(companyId)}`, { method: 'DELETE' }),
  },

  rewards: {
    list:    (companyId: string)                    => request<{ rewards: any[] }>(`/api/rewards?companyId=${companyId}`),
    pending: (params: Record<string, string>)      => request<{ rewards: any[] }>(`/api/rewards/pending?${new URLSearchParams(params).toString()}`),
    create:  (data: Record<string, unknown>)      => request<{ reward: any }>('/api/rewards', { method: 'POST', body: JSON.stringify(data) }),
    ack:     (rewardId: string, data: Record<string, unknown>) => request(`/api/rewards/${rewardId}/ack`, { method: 'POST', body: JSON.stringify(data) }),
    remove:  (id: string, companyId: string)      =>
      request(`/api/rewards/${id}?companyId=${encodeURIComponent(companyId)}`, { method: 'DELETE' }),
  },

  tenantCompany: {
    get:   (companyId: string)                      => request<{ company: any }>(`/api/tenant-company?companyId=${companyId}`),
    patch: (companyId: string, data: Record<string, unknown>) => request<{ company: any }>(`/api/tenant-company/${companyId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
};
