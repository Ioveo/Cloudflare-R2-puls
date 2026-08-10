type UserRule = {
  password?: string;
  paths?: string[] | string;
};

function allowedPath(path: string, rules: string | string[]) {
  if (!rules) return true;
  const paths = Array.isArray(rules) ? rules : String(rules || "").split(",");
  return paths.some((prefix) => {
    const trimmed = prefix.trim();
    if (trimmed === "*" || trimmed === "/" || !trimmed) return true;
    return path.startsWith(trimmed);
  });
}

function getRequestPath(context) {
  const pathname = new URL(context.request.url).pathname;
  const marker = "/api/write/items/";
  const rawPath = pathname.includes(marker) ? pathname.split(marker)[1] : "";
  try {
    return decodeURIComponent(rawPath || "");
  } catch {
    return rawPath || "";
  }
}

function getBasicAccount(header: string | null) {
  if (!header || !header.startsWith("Basic ")) return null;
  try {
    const decoded = atob(header.slice(6));
    const separator = decoded.indexOf(":");
    if (separator < 1) return null;
    return { username: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

function getJsonUserRule(env: Record<string, unknown>, username: string, password: string): UserRule | null {
  if (typeof env.AUTH_USERS !== "string" || !env.AUTH_USERS.trim()) return null;
  try {
    const users = JSON.parse(env.AUTH_USERS);
    const rule = Array.isArray(users)
      ? users.find((item) => item?.username === username)
      : users?.[username];
    if (!rule || typeof rule !== "object" || String(rule.password) !== password) return null;
    return rule;
  } catch {
    return null;
  }
}

function matchesSimpleCredentials(env: Record<string, unknown>, username: string, password: string): boolean {
  // Support all common Cloudflare Pages / Workers environment variable aliases
  const adminCandidates = [env.ADMIN, env.ADMIN_USERNAME, env.ADMIN_USER, env.USER, env.USERNAME, env.AUTH_USER];
  const passCandidates = [env.PASS, env.ADMIN_PASSWORD, env.ADMIN_PASS, env.PASSWORD, env.AUTH_PASS, env.AUTH_PASSWORD];

  for (let i = 0; i < adminCandidates.length; i++) {
    const a = adminCandidates[i];
    const p = passCandidates[i];
    if (typeof a === "string" && typeof p === "string" && a.trim() && p.trim()) {
      if (username === a.trim() && password === p.trim()) return true;
    }
  }

  // Cross-match: ADMIN with any password candidate
  const adminVal = (typeof env.ADMIN === "string" ? env.ADMIN : "") || (typeof env.ADMIN_USERNAME === "string" ? env.ADMIN_USERNAME : "") || (typeof env.USER === "string" ? env.USER : "");
  const passVal = (typeof env.PASS === "string" ? env.PASS : "") || (typeof env.ADMIN_PASSWORD === "string" ? env.ADMIN_PASSWORD : "") || (typeof env.PASSWORD === "string" ? env.PASSWORD : "");

  if (adminVal && passVal && username === adminVal.trim() && password === passVal.trim()) {
    return true;
  }

  return false;
}

export function get_auth_status(context) {
  const url = new URL(context.request.url);
  const isTestEndpoint = url.pathname.includes("/api/write/test");
  const path = getRequestPath(context);

  if (!isTestEndpoint && path.startsWith("_$flaredrive$/thumbnails/")) return true;

  if (!isTestEndpoint && context.env.GUEST && allowedPath(path, context.env.GUEST as string)) return true;

  const account = getBasicAccount(context.request.headers.get("Authorization"));
  if (!account) return false;

  // 1. Simple environment variables (ADMIN + PASS, ADMIN_USER + ADMIN_PASS, etc.)
  if (matchesSimpleCredentials(context.env, account.username, account.password)) {
    return true;
  }

  // 2. JSON structured rules (AUTH_USERS)
  const jsonRule = getJsonUserRule(context.env, account.username, account.password);
  if (jsonRule) {
    if (isTestEndpoint) return true;
    return allowedPath(path, jsonRule.paths || "*");
  }

  // 3. Backward compatibility with `username:password` variable format
  const legacyRule = context.env[`${account.username}:${account.password}`];
  if (typeof legacyRule === "string") {
    if (isTestEndpoint) return true;
    return allowedPath(path, legacyRule);
  }

  return false;
}
