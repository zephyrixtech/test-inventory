import { toast } from 'react-hot-toast';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1';

const getAccessToken = (): string | null => {
  const stored = localStorage.getItem('accessToken');
  if (stored) {
    return stored;
  }

  const storedUser = localStorage.getItem('userData');
  if (!storedUser) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedUser);
    return parsed?.accessToken ?? null;
  } catch {
    return null;
  }
};

const buildHeaders = (hasBody: boolean) => {
  const headers: HeadersInit = {};
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const data = await response.json();
      errorMessage = data?.error?.message ?? data?.message ?? errorMessage;
    } catch {
      // ignore json parse errors
    }

    if (response.status === 401) {
      toast.error('Session expired. Please login again.');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('roleName');
    }

    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
};

const request = async <T>(method: HttpMethod, path: string, body?: unknown): Promise<T> => {
  const hasBody = body !== undefined && body !== null;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: buildHeaders(hasBody),
    body: hasBody ? JSON.stringify(body) : undefined
  });

  return handleResponse<T>(response);
};

export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path)
};

