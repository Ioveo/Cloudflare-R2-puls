import { getStorage, notFound, parseBucketPath } from "@/utils/bucket";

export async function onRequestGet(context) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();
  const { publicUrl } = getStorage(context);
  if (!publicUrl) return notFound();
  const rawPath = new URL(context.request.url).pathname.split("/raw/")[1];
  const url = publicUrl.replace(/\/$/, "") + "/" + rawPath;

  var response =await fetch(new Request(url, {
    body: context.request.body,
    headers: context.request.headers,
    method: context.request.method,
    redirect: "follow",
}))


  const headers = new Headers(response.headers);
  if (path.startsWith("_$flaredrive$/thumbnails/")){
    headers.set("Cache-Control", "max-age=31536000");
  }

  return new Response(response.body, {
    headers: headers,
    status: response.status,
    statusText: response.statusText
});
}
