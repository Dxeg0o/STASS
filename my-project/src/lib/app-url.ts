import type { NextRequest } from "next/server";
import "server-only";

const LOCAL_HOST_RE = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function isLocalUrl(url: string) {
  try {
    return LOCAL_HOST_RE.test(new URL(url).host);
  } catch {
    return false;
  }
}

export function getAppBaseUrl(req?: NextRequest) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredUrl && !isLocalUrl(configuredUrl)) {
    return stripTrailingSlash(configuredUrl);
  }

  const forwardedHost = req?.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || req?.headers.get("host")?.trim();

  if (host) {
    const forwardedProto = req?.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const proto = forwardedProto || (LOCAL_HOST_RE.test(host) ? "http" : "https");
    return `${proto}://${host}`;
  }

  return stripTrailingSlash(configuredUrl || "http://localhost:3000");
}
