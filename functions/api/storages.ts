import { getStorageDefinitions } from "@/utils/bucket";

export async function onRequestGet(context) {
  const storages = getStorageDefinitions(context.env).map(({ id, label }) => ({ id, label }));
  return new Response(JSON.stringify({ storages }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
