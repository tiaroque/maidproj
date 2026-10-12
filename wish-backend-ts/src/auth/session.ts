import { Request } from "express";
import Keygrip from "keygrip";
import config from "../endpoints.config";

export const sessionCookieName = "session";

// Must match the keys given to cookieSession in app.ts so `session.sig` verifies.
const sessionKeys = new Keygrip([config.sessionSecret]);

export type SessionUser = {
  uid: string;
  email: string;
  name?: string;
  emailVerified?: boolean;
};

export const setUserSession = (req: Request, user: SessionUser) => {
  if (!req.session) {
    return;
  }
  req.session.uid = user.uid;
  req.session.email = user.email;
  req.session.name = user.name;
  req.session.emailVerified = user.emailVerified ?? true;
};

export const parseCookies = (cookieHeader?: string) => {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) {
    return cookies;
  }
  decodeURIComponent(cookieHeader)
    .split(";")
    .forEach((cookie) => {
      const parts = cookie.split("=");
      const key = parts.shift()?.trim();
      if (key) {
        cookies[key] = (parts.join("=") || "").trim();
      }
    });
  return cookies;
};

export const readSessionFromCookies = (cookieHeader?: string) => {
  const cookies = parseCookies(cookieHeader);
  const raw = cookies[sessionCookieName];
  const signature = cookies[`${sessionCookieName}.sig`];
  if (
    !raw ||
    !signature ||
    !sessionKeys.verify(`${sessionCookieName}=${raw}`, signature)
  ) {
    return null;
  }
  try {
    const payload = raw.split(".", 1)[0].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(payload, "base64").toString("utf8");
    const session = JSON.parse(json) as SessionUser;
    if (!session?.uid) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
};
