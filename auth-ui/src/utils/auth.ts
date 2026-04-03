import { jwtDecode } from "jwt-decode";

export type JwtPayload = {
  sub: string;
  role?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  exp?: number;
  iat?: number;
};

export function getAccessToken(): string | null {
  return localStorage.getItem("accessToken");
}

export function getRefreshToken(): string | null {
  return localStorage.getItem("refreshToken");
}

export function clearTokens(): void {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

export function decodeToken(): JwtPayload | null {
  const token = getAccessToken();
  if (!token) return null;

  try {
    return jwtDecode<JwtPayload>(token);
  } catch {
    return null;
  }
}

export function getCurrentRole(): string | null {
  return decodeToken()?.role ?? null;
}

export function getCurrentEmail(): string | null {
  return decodeToken()?.sub ?? null;
}

export function getCurrentUsername(): string | null {
  return decodeToken()?.username ?? null;
}

export function getCurrentFirstName(): string | null {
  return decodeToken()?.firstName ?? null;
}

export function getCurrentLastName(): string | null {
  return decodeToken()?.lastName ?? null;
}

export function getCurrentFullName(): string | null {
  const firstName = getCurrentFirstName()?.trim();
  const lastName = getCurrentLastName()?.trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return fullName || null;
}

export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;

  const payload = decodeToken();
  if (!payload?.exp) return false;

  const now = Date.now() / 1000;
  return payload.exp > now;
}

export function isAdmin(): boolean {
  return getCurrentRole() === "ADMIN";
}
