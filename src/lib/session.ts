import { cookies } from 'next/headers';

// Team members never sign in — their nickname profile id is stored in an
// httpOnly cookie the first time they fill out the lightweight onboarding
// form, so returning visitors skip straight to the app. Admin auth is a
// separate, simpler cookie gated behind a passcode (see /admin/login).

const USER_COOKIE = 'office_aux_uid';
const ADMIN_COOKIE = 'office_aux_admin';

export function getSessionUserId(): string | null {
  return cookies().get(USER_COOKIE)?.value ?? null;
}

export function setSessionUserIdOnResponse(res: Response, userId: string) {
  res.headers.append(
    'Set-Cookie',
    `${USER_COOKIE}=${userId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`
  );
}

export function isAdminSession(): boolean {
  return cookies().get(ADMIN_COOKIE)?.value === '1';
}

export function setAdminCookieOnResponse(res: Response) {
  res.headers.append('Set-Cookie', `${ADMIN_COOKIE}=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 12}`);
}

export function clearAdminCookieOnResponse(res: Response) {
  res.headers.append('Set-Cookie', `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}
