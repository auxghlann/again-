export class ApiError extends Error {
  public status: number;
  public data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorData: unknown = null;
      let errorMessage = `HTTP ${response.status} ${response.statusText}`;

      try {
        errorData = await response.json();
        if (typeof errorData === 'object' && errorData !== null && 'detail' in errorData) {
          errorMessage = String((errorData as { detail: unknown }).detail);
        }
      } catch {
        // Response was not JSON
      }

      throw new ApiError(errorMessage, response.status, errorData);
    }

    // Return parsed JSON data
    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Network request failed';
    throw new ApiError(message, 0);
  }
}
