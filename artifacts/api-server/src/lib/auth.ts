import crypto from "node:crypto";
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import * as oidc from "openid-client";
import { db, sessionsTable } from "@workspace/db";

export type AuthUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
};

export const ISSUER_URL = process.env.ISSUER_URL ?? "https://replit.com/oidc";
export const SESSION_COOKIE = "sid";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

export type SessionData = {
  user: AuthUser;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
};

let oidcConfig: oidc.Configuration | null = null;

export async function getOidcConfig() {
  if (!oidcConfig) {
    if (!process.env.REPL_ID) {
      throw new Error("REPL_ID is required to configure authentication.");
    }
    oidcConfig = await oidc.discovery(
      new URL(ISSUER_URL),
      process.env.REPL_ID,
    );
  }
  return oidcConfig;
}

export async function createSession(data: SessionData) {
  const sid = crypto.randomBytes(32).toString("hex");
  await db.insert(sessionsTable).values({
    sid,
    sess: data as unknown as Record<string, unknown>,
    expire: new Date(Date.now() + SESSION_TTL),
  });
  return sid;
}

export async function getSession(sid: string): Promise<SessionData | null> {
  const [row] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.sid, sid));
  if (!row || row.expire < new Date()) {
    if (row) await deleteSession(sid);
    return null;
  }
  return row.sess as unknown as SessionData;
}

export async function updateSession(sid: string, data: SessionData) {
  await db
    .update(sessionsTable)
    .set({
      sess: data as unknown as Record<string, unknown>,
      expire: new Date(Date.now() + SESSION_TTL),
    })
    .where(eq(sessionsTable.sid, sid));
}

export async function deleteSession(sid: string) {
  await db.delete(sessionsTable).where(eq(sessionsTable.sid, sid));
}

export async function clearSession(res: Response, sid?: string) {
  if (sid) await deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionId(req: Request) {
  const authHeader = req.headers.authorization;
  if (
    authHeader?.startsWith("Bearer ") &&
    /^[0-9a-f]{64}$/i.test(authHeader.slice(7))
  ) {
    return authHeader.slice(7);
  }
  return req.cookies?.[SESSION_COOKIE] as string | undefined;
}