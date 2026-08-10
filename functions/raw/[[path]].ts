import { getStorage, notFound, parseBucketPath } from "@/utils/bucket";

export async function onRequestGet(context) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();
  const { publicUrl } = getStorage(context);
  const rawPath = new URL(context.request.url).pathname.split("/raw/")[1];
  const decodedPath = decodeURIComponent(rawPath || "");

  if (publicUrl) {
    const url = publicUrl.replace(/\/$/, "") + "/" + rawPath;
    try {
      const response = await fetch(
        new Request(url, {
          body: context.request.body,
          headers: context.request.headers,
          method: context.request.method,
          redirect: "follow",
        })
      );

      const headers = new Headers(response.headers);
      if (decodedPath.startsWith("_$flaredrive$/thumbnails/")) {
        headers.set("Cache-Control", "max-age=31536000");
      }

      return new Response(response.body, {
        headers: headers,
        status: response.status,
        statusText: response.statusText,
      });
    } catch {
      // Fallback to direct R2 bucket read if publicUrl fetch fails
    }
  }

  // Fallback: direct R2 bucket stream when PUBURL is not set or unavailable
  const object = await bucket.get(decodedPath);
  if (!object) return notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  if (decodedPath.startsWith("_$flaredrive$/thumbnails/")) {
    headers.set("Cache-Control", "max-age=31536000");
  }

  return new Response(object.body, {
    headers,
    status: 200,
  });
}
