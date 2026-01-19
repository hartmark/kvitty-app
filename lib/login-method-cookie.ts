const COOKIE_NAME = "kvitty_last_login_method";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type LoginMethod = "google" | "email";

export function setLoginMethodCookie(method: LoginMethod) {
  const value = encodeURIComponent(method);
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function getLoginMethodCookie(): LoginMethod | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(new RegExp(`(^| )${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;

  try {
    const value = decodeURIComponent(match[2]);
    return value === "google" || value === "email" ? value : null;
  } catch {
    return null;
  }
}
