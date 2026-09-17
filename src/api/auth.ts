import { apiRequest, clearTokens, getRefreshToken, setTokens } from "./client";
import type { LoginResponse, MeResponse } from "../types";

export async function login(email: string, password: string): Promise<LoginResponse> {
  const data = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function fetchMe(): Promise<MeResponse> {
  return apiRequest<MeResponse>("/auth/me");
}

export async function logout(): Promise<void> {
  const refresh = getRefreshToken();
  try {
    await apiRequest<{ message: string }>("/auth/logout", {
      method: "POST",
      headers: refresh ? { "X-Refresh-Token": refresh } : {},
    });
  } finally {
    clearTokens();
  }
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: { email },
    auth: false,
  });
}
