import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as authApi from "../api/auth";
import { clearTokens, getAccessToken } from "../api/client";
import type { LoginNextStep, LoginResponse, MeResponse, PersonBrief, ProductBrief } from "../types";

type AuthState = {
  user: PersonBrief | null;
  products: ProductBrief[];
  nextStep: LoginNextStep | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  /** Apply an already-fetched /auth/me payload without another GET. */
  applyMe: (me: MeResponse) => void;
  isSuperAdmin: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PersonBrief | null>(null);
  const [products, setProducts] = useState<ProductBrief[]>([]);
  const [nextStep, setNextStep] = useState<LoginNextStep | null>(null);
  const [loading, setLoading] = useState(true);

  const applyMe = useCallback((me: MeResponse) => {
    setUser(me.user);
    setProducts(me.products);
    setNextStep(me.next_step);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setProducts([]);
      setNextStep(null);
      setLoading(false);
      return;
    }
    try {
      const me = await authApi.fetchMe();
      applyMe(me);
    } catch {
      clearTokens();
      setUser(null);
      setProducts([]);
      setNextStep(null);
    } finally {
      setLoading(false);
    }
  }, [applyMe]);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setUser(data.user);
    setProducts(data.products);
    setNextStep(data.next_step);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      clearTokens();
    }
    setUser(null);
    setProducts([]);
    setNextStep(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      products,
      nextStep,
      loading,
      login,
      logout,
      refreshMe,
      applyMe,
      isSuperAdmin: user?.role === "platform_super_admin",
    }),
    [user, products, nextStep, loading, login, logout, refreshMe, applyMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
