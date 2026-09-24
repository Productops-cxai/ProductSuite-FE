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

export async function updateProfile(full_name: string): Promise<MeResponse> {
  return apiRequest<MeResponse>("/auth/me", {
    method: "PATCH",
    body: { full_name },
  });
}

export async function changePassword(
  current_password: string,
  new_password: string,
  confirm_password: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/auth/change-password", {
    method: "POST",
    body: { current_password, new_password, confirm_password },
  });
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

export async function previewActivation(token: string) {
  return apiRequest<{ email: string; full_name: string }>(
    `/auth/activation/${encodeURIComponent(token)}`,
    { auth: false },
  );
}

export async function activateAccount(
  token: string,
  new_password: string,
  confirm_password: string,
) {
  return apiRequest<{ message: string }>("/auth/activate", {
    method: "POST",
    body: { token, new_password, confirm_password },
    auth: false,
  });
}

export async function resetPassword(
  token: string,
  new_password: string,
  confirm_password: string,
) {
  return apiRequest<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: { token, new_password, confirm_password },
    auth: false,
  });
}
