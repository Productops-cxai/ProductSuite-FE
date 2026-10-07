const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "/api";

const ACCESS_KEY = "ps_access_token";
const REFRESH_KEY = "ps_refresh_token";
const SESSION_ENDED_KEY = "ps_session_ended_msg";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/** Read-and-clear message set when another login killed this session. */
export function takeSessionEndedMessage(): string | null {
  const msg = sessionStorage.getItem(SESSION_ENDED_KEY);
  if (msg) sessionStorage.removeItem(SESSION_ENDED_KEY);
  return msg;
}

export function markSessionEnded(detail: string, code?: string): void {
  if (
    code === "session_replaced" ||
    code === "session_ended" ||
    /another location/i.test(detail) ||
    /session has ended/i.test(detail)
  ) {
    sessionStorage.setItem(SESSION_ENDED_KEY, detail);
  }
}

export class ApiError extends Error {
  status: number;
  detail: string;
  code?: string;

  constructor(status: number, detail: string, code?: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
    this.code = code;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
};

async function parseError(res: Response): Promise<ApiError> {
  let detail = res.statusText || "Request failed";
  let code: string | undefined;
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") {
      detail = data.detail;
    } else if (
      data?.detail &&
      typeof data.detail === "object" &&
      !Array.isArray(data.detail) &&
      typeof data.detail.message === "string"
    ) {
      detail = data.detail.message;
      if (typeof data.detail.code === "string") code = data.detail.code;
    } else if (Array.isArray(data?.detail)) {
      detail = data.detail
        .map((d: { loc?: unknown[]; msg?: string; type?: string }) => {
          const msg = (d.msg || "").replace(/^Value error,\s*/i, "").trim();
          const loc = Array.isArray(d.loc) ? d.loc.filter((p) => p !== "body") : [];
          const field = loc.length ? String(loc[loc.length - 1]) : "";
          const fieldLabel = friendlyFieldLabel(field);
          if (fieldLabel && msg) {
            // Prefer custom validator messages; otherwise pair field + msg.
            if (/required/i.test(msg) || msg.toLowerCase().includes(fieldLabel.toLowerCase())) {
              return msg.endsWith(".") ? msg.slice(0, -1) : msg;
            }
            return `${fieldLabel}: ${msg}`;
          }
          return msg || JSON.stringify(d);
        })
        .filter(Boolean)
        .join(". ");
    }
  } catch {
    /* ignore */
  }
  if (res.status === 401) {
    markSessionEnded(detail, code);
    if (code === "session_replaced" || code === "session_ended" || /another location/i.test(detail)) {
      notifySessionEnded();
    }
  }
  return new ApiError(res.status, detail, code);
}

function notifySessionEnded(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("ps:session-ended"));
}

function friendlyFieldLabel(field: string): string {
  const map: Record<string, string> = {
    name: "Portfolio name",
    code: "Portfolio code / reference",
    full_name: "Full name",
    email: "Email",
    role_code: "Role",
    status: "Status",
    client_type: "Client type",
    business_domain: "Business use case",
  };
  if (!field) return "";
  return map[field] || field.replace(/_/g, " ");
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, headers = {} } = options;
  const reqHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  if (body !== undefined) {
    reqHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getAccessToken();
    if (token) reqHeaders.Authorization = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: reqHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const token = getAccessToken();
      if (token) reqHeaders.Authorization = `Bearer ${token}`;
      res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: reqHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    }
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Blob download (e.g. bulk-upload Excel template) — same auth/refresh handling as apiRequest. */
export async function apiRequestBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const { method = "GET", auth = true, headers = {} } = options;
  const reqHeaders: Record<string, string> = { ...headers };
  if (auth) {
    const token = getAccessToken();
    if (token) reqHeaders.Authorization = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE}${path}`, { method, headers: reqHeaders });

  if (res.status === 401 && auth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const token = getAccessToken();
      if (token) reqHeaders.Authorization = `Bearer ${token}`;
      res = await fetch(`${API_BASE}${path}`, { method, headers: reqHeaders });
    }
  }

  if (!res.ok) throw await parseError(res);
  return res.blob();
}

/** Multipart form upload — never sets a JSON Content-Type header (browser sets the boundary). */
export async function apiRequestMultipart<T>(
  path: string,
  formData: FormData,
  options: { method?: string; auth?: boolean } = {},
): Promise<T> {
  const { method = "POST", auth = true } = options;
  const reqHeaders: Record<string, string> = { Accept: "application/json" };
  if (auth) {
    const token = getAccessToken();
    if (token) reqHeaders.Authorization = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE}${path}`, { method, headers: reqHeaders, body: formData });

  if (res.status === 401 && auth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const token = getAccessToken();
      if (token) reqHeaders.Authorization = `Bearer ${token}`;
      res = await fetch(`${API_BASE}${path}`, { method, headers: reqHeaders, body: formData });
    }
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) {
      await parseError(res);
      clearTokens();
      return false;
    }
    const data = (await res.json()) as { access_token: string; refresh_token: string };
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}
