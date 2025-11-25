// Centralized API helper for PharmaFulfill Frontend
// - Uses a single BASE_URL
// - Automatically parses JSON
// - Shows toast errors for mutations (POST, PUT, PATCH, DELETE)
// - Keeps GET requests silent by default (no spam / no dashboard noise)

import { toast } from "sonner";

const BASE_URL = "http://localhost:5000";

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data: T;
}

interface ApiOptions extends RequestInit {
  /** If true, no toast will be shown for errors/success */
  silent?: boolean;
  /** Optional success message to show on 2xx responses */
  successMessage?: string;
}

async function apiFetch<T = any>(
  path: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const {
    silent = false,
    successMessage,
    headers,
    ...fetchOptions
  } = options;

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      credentials: "include", // allow Flask session cookies
      headers: {
        "Content-Type": "application/json",
        ...(headers || {}),
      },
      ...fetchOptions,
    });

    // Try to parse JSON; if it fails, use {} as fallback
    let data: T = (await res.json().catch(() => ({}))) as T;

    // Handle error responses
    if (!res.ok && !silent) {
      const message =
        (data as any)?.error ||
        (data as any)?.message ||
        `Request failed with status ${res.status}`;
      toast.error(message);
    }

    // Handle success message if provided
    if (res.ok && successMessage && !silent) {
      toast.success(successMessage);
    }

    return {
      ok: res.ok,
      status: res.status,
      data,
    };
  } catch (err: any) {
    console.error("API Fetch Error:", err);

    if (!silent) {
      toast.error("Unable to reach the server. Please try again.");
    }

    return {
      ok: false,
      status: 0,
      data: {
        error: "Unable to reach server.",
      } as any,
    };
  }
}

const api = {
  /**
   * GET requests are **silent by default** so dashboards and background
   * data loading won't spam toasts if something goes wrong.
   */
  get: <T = any>(path: string, options: Omit<ApiOptions, "method" | "body"> = {}) =>
    apiFetch<T>(path, { method: "GET", silent: options.silent ?? true, ...options }),

  /**
   * POST requests show toast errors by default.
   * You can override with { silent: true } if needed.
   */
  post: <T = any>(path: string, body?: any, options: Omit<ApiOptions, "method" | "body"> = {}) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      silent: options.silent ?? false,
      ...options,
    }),

  put: <T = any>(path: string, body?: any, options: Omit<ApiOptions, "method" | "body"> = {}) =>
    apiFetch<T>(path, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      silent: options.silent ?? false,
      ...options,
    }),

  patch: <T = any>(path: string, body?: any, options: Omit<ApiOptions, "method" | "body"> = {}) =>
    apiFetch<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      silent: options.silent ?? false,
      ...options,
    }),

  delete: <T = any>(path: string, options: Omit<ApiOptions, "method" | "body"> = {}) =>
    apiFetch<T>(path, {
      method: "DELETE",
      silent: options.silent ?? false,
      ...options,
    }),
};

export default api;
