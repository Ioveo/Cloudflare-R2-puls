type UserRule = {
  password?: string;
  paths?: string[] | string;
};

function allowedPath(path: string, rules: string | string[]) {
  const paths = Array.isArray(rules) ? rules : String(rules || "").split(",");
  return paths.some((prefix) => prefix === "*" || (prefix && path.startsWith(prefix)));
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

function getJsonUserRule(env, username: string, password: string): UserRule | null {
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

function matchesSimpleCredentials(env, username: string, password: string) {
  const admin = typeof env.ADMIN === "string" ? env.ADMIN : "";
  const pass = typeof env.PASS === "string" ? env.PASS : "";
  return Boolean(admin && pass && username === admin && password === pass);
}

export function get_auth_status(context) {
  const path = getRequestPath(context);
  if (path.startsWith("_$flaredrive$/thumbnails/")) return true;

  if (context.env.GUEST && allowedPath(path, context.env.GUEST)) return true;

  const account = getBasicAccount(new Headers(context.request.headers).get("Authorization"));
  if (!account) return false;

  // Simplest setup: ADMIN contains the username and PASS contains the password.
  if (matchesSimpleCredentials(context.env, account.username, account.password)) return true;

  const jsonRule = getJsonUserRule(context.env, account.username, account.password);
  if (jsonRule) return allowedPath(path, jsonRule.paths || "");

  // Backward compatibility with the original `username:password` variable format.
  const legacyRule = context.env[`${account.username}:${account.password}`];
  return typeof legacyRule === "string" && allowedPath(path, legacyRule);
}
