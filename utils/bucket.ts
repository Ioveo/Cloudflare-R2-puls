export type StorageDefinition = {
  id: string;
  label: string;
  binding: string;
  publicUrl?: string;
};

function isStorageDefinition(value: unknown): value is Partial<StorageDefinition> {
  return Boolean(value) && typeof value === "object";
}

export function getStorageDefinitions(env: Record<string, unknown>): StorageDefinition[] {
  const defaults = [{ id: "default", label: "主存储", binding: "BUCKET", publicUrl: String(env.PUBURL || "") }];
  const source = env.STORAGES;
  if (typeof source !== "string" || !source.trim()) return defaults;

  try {
    const parsed = JSON.parse(source);
    if (!Array.isArray(parsed)) return defaults;
    const configured = parsed
      .filter(isStorageDefinition)
      .filter((item) => typeof item.id === "string" && /^[a-zA-Z0-9_-]+$/.test(item.id))
      .filter((item) => typeof item.binding === "string" && /^[A-Z0-9_]+$/.test(item.binding))
      .map((item) => ({
        id: item.id as string,
        label: typeof item.label === "string" && item.label.trim() ? item.label.trim() : item.id as string,
        binding: item.binding as string,
        publicUrl: typeof item.publicUrl === "string" ? item.publicUrl.replace(/\/$/, "") : "",
      }));
    return configured.length ? configured : defaults;
  } catch {
    return defaults;
  }
}

export function getStorage(context) {
  const url = new URL(context.request.url);
  const requestedId = context.request.headers.get("x-storage-id") || url.searchParams.get("storage") || "default";
  const definitions = getStorageDefinitions(context.env);
  const definition = definitions.find((item) => item.id === requestedId) || definitions[0];
  const driveId = url.hostname.replace(/\..*/, "");
  const bucket = context.env[definition.binding] || context.env[driveId] || context.env.BUCKET;
  const publicUrl = definition.publicUrl || context.env.PUBURL || "";
  return { bucket, publicUrl, definition };
}

export function notFound() {
  return new Response("Not found", { status: 404 });
}

export function parseBucketPath(context): [any, string] {
  const { params } = context;
  const pathSegments = (params.path || []) as String[];
  const path = decodeURIComponent(pathSegments.join("/"));
  return [getStorage(context).bucket, path];
}
