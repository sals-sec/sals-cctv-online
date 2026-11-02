import { CctvRequest, UserAccount, UserRole } from '../types.ts';

let activeUserId: string | null = null;

export function setActiveUserId(uid: string | null) {
  activeUserId = uid;
  if (uid) {
    sessionStorage.setItem('cctv_active_uid', uid);
  } else {
    sessionStorage.removeItem('cctv_active_uid');
  }
}

export function getActiveUserId(): string | null {
  if (activeUserId) return activeUserId;
  return sessionStorage.getItem('cctv_active_uid');
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const uid = getActiveUserId();
  return {
    'Content-Type': 'application/json',
    ...(uid ? { 'x-user-id': uid } : {}),
  };
}

export async function loginApi(username: string, pass: string): Promise<UserAccount> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: pass }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Invalid User ID or password.');
  }
  const result = await res.json();
  const user = result.user;
  setActiveUserId(user.u);
  return user;
}

export async function fetchRequestsApi(): Promise<CctvRequest[]> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/requests', { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to load requests from Cloud SQL');
  }
  return await res.json();
}

export async function saveRequestApi(req: CctvRequest): Promise<CctvRequest> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/requests', {
    method: 'POST',
    headers,
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to save request to Cloud SQL');
  }
  const result = await res.json();
  return result.request;
}

export async function batchSaveRequestsApi(requests: CctvRequest[]): Promise<CctvRequest[]> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/requests/batch', {
    method: 'POST',
    headers,
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to batch import requests');
  }
  const result = await res.json();
  return result.requests;
}

export async function deleteRequestApi(id: string): Promise<boolean> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/requests/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete request from Cloud SQL');
  }
  return true;
}

export async function fetchUsersApi(): Promise<UserAccount[]> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/users', { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to load users');
  }
  return await res.json();
}

export async function createUserApi(username: string, pass: string, role: UserRole): Promise<UserAccount> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/users', {
    method: 'POST',
    headers,
    body: JSON.stringify({ username, password: pass, role }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create user in Cloud SQL');
  }
  const result = await res.json();
  return result.user;
}

export async function updateUserRoleApi(uid: string, role: UserRole) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/users/${encodeURIComponent(uid)}/role`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to update user role');
  }
  return await res.json();
}

export async function deleteUserApi(uid: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/users/${encodeURIComponent(uid)}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete user');
  }
  return true;
}

export async function fetchSettingsApi() {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/settings', { headers });
  if (!res.ok) return null;
  return await res.json();
}

export async function saveSettingsApi(settings: any) {
  const headers = await getAuthHeaders();
  await fetch('/api/settings', {
    method: 'POST',
    headers,
    body: JSON.stringify(settings),
  });
}
