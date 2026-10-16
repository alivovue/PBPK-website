const baseUrl = (import.meta.env?.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

export async function request(path, { token, signal, method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method, headers, signal,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Tidak dapat terhubung. Periksa koneksi lalu coba lagi.', 0);
  }

  if (response.status === 204) return null;
  let data;
  try {
    data = await response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Respons tidak dapat dibaca. Silakan coba lagi.', response.status);
  }
  if (!response.ok) {
    const message = typeof data?.detail === 'string'
      ? data.detail
      : 'Data tidak dapat dimuat. Silakan coba lagi.';
    throw new ApiError(message, response.status, data?.detail);
  }
  return data;
}
