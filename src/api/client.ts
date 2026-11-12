const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "/api";

const SESSION_ENDED_KEY = "ps_session_ended_msg";
/** Set while the user is actively signing out — suppress forced-logout banners. */
const INTENTIONAL_LOGOUT_KEY = "ps_intentional_logout";
/** Legacy keys — cleared on boot so JWTs never linger in localStorage. */
const LEGACY_ACCESS_KEY = "ps_access_token";
const LEGACY_REFRESH_KEY = "ps_refresh_token";
const IMPORT_RUNS_KEY = "payflow-import-runs";

/** Generic 401s that must never appear as a login-page banner. */
const IGNORE_SESSION_DETAILS = [
  /^not authenticated$/i,
  /^unauthorized$/i,
  /^token revoked$/i,
  /^invalid refresh token$/i,
  /^invalid or expired access token/i,
  /^refresh token expired or already used$/i,
  /^user not active$/i,
];

/** Wipe legacy token / PII keys from browser storage (idempotent). */
export function scrubSensitiveBrowserStorage(): void {
  try {
    localStorage.removeItem(LEGACY_ACCESS_KEY);
    localStorage.removeItem(LEGACY_REFRESH_KEY);
    localStorage.removeItem(IMPORT_RUNS_KEY);
  } catch {
    /* ignore */
  }
}

scrubSensitiveBrowserStorage();

/** @deprecated Tokens are HttpOnly cookies — always null from JS. */
export function getAccessToken(): string | null {
  return null;
}

/** @deprecated Tokens are HttpOnly cookies — always null from JS. */
export function getRefreshToken(): string | null {
  return null;
}

/** No-op: session is carried by HttpOnly cookies set by the API. */
export function setTokens(_access: string, _refresh: string): void {
  scrubSensitiveBrowserStorage();
}

/** Clears any leftover client-side secrets (cookies cleared by /auth/logout). */
export function clearTokens(): void {
  scrubSensitiveBrowserStorage();
}

/** Call at the start of an explicit Sign out so follow-up 401s are silent. */
export function beginIntentionalLogout(): void {
  try {
    sessionStorage.setItem(INTENTIONAL_LOGOUT_KEY, "1");
    sessionStorage.removeItem(SESSION_ENDED_KEY);
  } catch {
    /* ignore */
  }
}

export function clearIntentionalLogout(): void {
  try {
    sessionStorage.removeItem(INTENTIONAL_LOGOUT_KEY);
  } catch {
    /* ignore */
  }
}

function isIntentionalLogout(): boolean {
  try {
    return sessionStorage.getItem(INTENTIONAL_LOGOUT_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearSessionEndedMessage(): void {
  try {
    sessionStorage.removeItem(SESSION_ENDED_KEY);
  } catch {
    /* ignore */
  }
}

/** Read-and-clear message set when another login killed this session. */
export function takeSessionEndedMessage(): string | null {
  if (isIntentionalLogout()) {
    clearSessionEndedMessage();
    clearIntentionalLogout();
    return null;
  }
  const msg = sessionStorage.getItem(SESSION_ENDED_KEY);
  if (msg) sessionStorage.removeItem(SESSION_ENDED_KEY);
  // Never surface raw API 401 text on the login form.
  if (msg && IGNORE_SESSION_DETAILS.some((re) => re.test(msg.trim()))) {
    return null;
  }
  return msg;
}

export function markSessionEnded(detail: string, code?: string): void {
  // User clicked Sign out — do not treat the next 401s as a forced kick.
  if (isIntentionalLogout()) return;
  // Logout / missing cookie — not "signed in elsewhere".
  if (code === "logged_out") return;
  const text = (detail || "").trim();
  if (!text || IGNORE_SESSION_DETAILS.some((re) => re.test(text))) return;

  const isReplaced =
    code === "session_replaced" || /another location/i.test(text);
  const isEnded =
    code === "session_ended" ||
    code === "refresh_expired" ||
    /session has ended/i.test(text) ||
    /refresh token expired/i.test(text);

  if (isReplaced || isEnded) {
    sessionStorage.setItem(SESSION_ENDED_KEY, text);
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
    // refresh_reused is a concurrent refresh race — not a real logout signal.
    // logged_out / intentional Sign out must not flash a forced-logout banner.
    if (code !== "refresh_reused" && code !== "logged_out" && !isIntentionalLogout()) {
      markSessionEnded(detail, code);
      if (
        code === "session_replaced" ||
        code === "session_ended" ||
        code === "refresh_expired" ||
        /another location/i.test(detail) ||
        /refresh token expired/i.test(detail) ||
        /session has ended/i.test(detail)
      ) {
        notifySessionEnded();
      }
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

function buildHeaders(
  headers: Record<string, string>,
  body: unknown | undefined,
): Record<string, string> {
  const reqHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };
  if (body !== undefined) {
    reqHeaders["Content-Type"] = "application/json";
  }
  return reqHeaders;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, headers = {} } = options;
  const reqHeaders = buildHeaders(headers, body);

  let res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: reqHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (res.status === 401 && auth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: reqHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        credentials: "include",
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

  let res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: reqHeaders,
    credentials: "include",
  });

  if (res.status === 401 && auth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: reqHeaders,
        credentials: "include",
      });
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

  let res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: reqHeaders,
    body: formData,
    credentials: "include",
  });

  if (res.status === 401 && auth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: reqHeaders,
        body: formData,
        credentials: "include",
      });
    }
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** In-flight refresh so parallel 401s share one rotation (avoids false session_replaced). */
let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({}),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await parseError(res);
        // Concurrent callers already rotated this refresh — cookie may already be new.
        if (err.code === "refresh_reused") {
          return false;
        }
        clearTokens();
        // Missing/cleared cookies after Sign out → silent; do not force "session_ended".
        if (!isIntentionalLogout() && err.code !== "logged_out") {
          markSessionEnded(err.detail, err.code);
          if (
            err.code === "session_replaced" ||
            err.code === "session_ended" ||
            err.code === "refresh_expired" ||
            /another location/i.test(err.detail) ||
            /session has ended/i.test(err.detail) ||
            /refresh token expired/i.test(err.detail)
          ) {
            notifySessionEnded();
          }
        }
        return false;
      }
      // Cookies updated by Set-Cookie; ignore any JSON token fields.
      return true;
    } catch {
      clearTokens();
      notifySessionEnded();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}
