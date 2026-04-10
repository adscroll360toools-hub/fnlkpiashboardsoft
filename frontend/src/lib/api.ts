// frontend/src/lib/api.ts
// Central API client that talks to the Express + MongoDB backend.
// All data access goes through this module — no direct DB calls from the frontend.

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : 'https://kpiadscroll360.onrender.com');

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
    setStatus:  (id: string, status: string)                          => request<{ task: any }>(`/api/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    submit:     (id: string, sub: Record<string, unknown>)            => request<{ task: any }>(`/api/tasks/${id}/submission`, { method: 'PATCH', body: JSON.stringify(sub) }),
    addMessage: (id: string, msg: Record<string, unknown>)            => request<{ task: any }>(`/api/tasks/${id}/messages`, { method: 'POST', body: JSON.stringify(msg) }),
    remove:     (id: string)                                          => request(`/api/tasks/${id}`, { method: 'DELETE' }),
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
    list:           (companyId: string)                       => request<{ kpis: any[] }>(`/api/kpis?companyId=${companyId}`),
    create:         (data: Record<string, unknown>)           => request<{ kpi: any }>('/api/kpis', { method: 'POST', body: JSON.stringify(data) }),
    updateProgress: (id: string, current: number)             => request<{ kpi: any }>(`/api/kpis/${id}/progress`, { method: 'PATCH', body: JSON.stringify({ current }) }),
    remove:         (id: string)                              => request(`/api/kpis/${id}`, { method: 'DELETE' }),
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
    list:   (companyId: string)                     => request<{ notifications: any[] }>(`/api/notifications?companyId=${companyId}`),
    create: (data: Record<string, unknown>)         => request<{ notification: any }>('/api/notifications', { method: 'POST', body: JSON.stringify(data) }),
  },

  roles: {
    list:   (companyId: string)                      => request<{ roles: any[] }>(`/api/roles?companyId=${companyId}`),
    create: (data: Record<string, unknown>)         => request<{ role: any }>('/api/roles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) => request<{ role: any }>(`/api/roles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string)                             => request(`/api/roles/${id}`, { method: 'DELETE' }),
  },
};
