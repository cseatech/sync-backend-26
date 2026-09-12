import { Response } from "express";
import config from "../config/env";

export const AUTH_COOKIE_NAME = "auth_token";

const cookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: config.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, cookieOptions);
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, cookieOptions);
}

export function getAuthCookie(cookieHeader: string | undefined): string | null {
  const cookie = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`));

  return cookie ? decodeURIComponent(cookie.slice(AUTH_COOKIE_NAME.length + 1)) : null;
}

export const CERT_ADMIN_COOKIE_NAME = "cert_admin_token";

export function setCertAdminCookie(res: Response, token: string): void {
  res.cookie(CERT_ADMIN_COOKIE_NAME, token, cookieOptions);
}

export function clearCertAdminCookie(res: Response): void {
  res.clearCookie(CERT_ADMIN_COOKIE_NAME, cookieOptions);
}

export function getCertAdminCookie(cookieHeader: string | undefined): string | null {
  const cookie = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CERT_ADMIN_COOKIE_NAME}=`));

  return cookie ? decodeURIComponent(cookie.slice(CERT_ADMIN_COOKIE_NAME.length + 1)) : null;
}