import { cookies } from "next/headers";

const COOKIE_NAME = "kvitty_user";

export interface UserCookie {
  slug: string;
  name?: string;
}

export async function getUserCookieServer(): Promise<UserCookie | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);

    if (!cookie?.value) return null;

    const decoded = decodeURIComponent(cookie.value);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}
