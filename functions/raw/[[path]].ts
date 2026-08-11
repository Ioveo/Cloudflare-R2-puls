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
      headers.set("Accept-Ranges", "bytes");
      if (decodedPath.startsWith("_$flaredrive$/thumbnails/")) {
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
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

  // Fallback: direct R2 bucket stream with full HTTP Range & Conditional header support
  const reqHeaders = context.request.headers;
  const rangeHeader = reqHeaders.get("range");

  let object;
  if (rangeHeader) {
    object = await bucket.get(decodedPath, {
      range: reqHeaders,
      onlyIf: reqHeaders,
    });
  } else {
    object = await bucket.get(decodedPath, {
      onlyIf: reqHeaders,
    });
  }

  if (!object) return notFound();

  // If conditional request matched (e.g. 304 Not Modified)
  if ("status" in object && object.status === 304) {
    return new Response(null, { status: 304 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Accept-Ranges", "bytes");

  if (decodedPath.startsWith("_$flaredrive$/thumbnails/")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    // Enable edge & browser caching for raw downloads to accelerate repeated requests worldwide
    if (!headers.has("Cache-Control")) {
      headers.set("Cache-Control", "public, max-age=14400, s-maxage=86400, stale-while-revalidate=604800");
    }
  }

  // If R2 handled a range request (e.g. IDM multi-thread or video scrub), return 206 Partial Content
  const status = object.range ? 206 : 200;
  if (object.range) {
    const { offset, length } = object.range;
    headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set("Content-Length", length.toString());
  }

  return new Response(object.body, {
    headers,
    status,
  });
}

