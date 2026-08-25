import { getStorage } from "@/utils/bucket";

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-storage-id",
    },
  });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const app = (url.searchParams.get("app") || "dy").toLowerCase();
  const { bucket, publicUrl, definition } = getStorage(context);

  if (!bucket) {
    return new Response(JSON.stringify({ error: "Storage bucket not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  // 尝试在多个可能路径中寻找 version.json
  const candidateKeys = [
    `apps/${app}/version.json`,
    `${app}-update/version.json`,
    `dy-update/version.json`,
    `version.json`,
  ];

  let versionObj = null;
  let foundKey = "";

  for (const key of candidateKeys) {
    const obj = await bucket.get(key);
    if (obj) {
      const text = await obj.text();
      try {
        versionObj = JSON.parse(text);
        foundKey = key;
        break;
      } catch (e) {}
    }
  }

  if (!versionObj) {
    return new Response(
      JSON.stringify({
        error: "Version metadata not found",
        app,
        hint: "请先在管理后台或存储桶中上传 apps/" + app + "/version.json",
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  // 格式化补丁下载链接为绝对 CDN 链接
  const origin = url.origin;
  const storageId = definition?.id || "default";

  const resolveUrl = (targetUrl?: string) => {
    if (!targetUrl) return "";
    if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
      return targetUrl;
    }
    const cleanPath = targetUrl.replace(/^\//, "");
    if (publicUrl) {
      return `${publicUrl.replace(/\/$/, "")}/${cleanPath}`;
    }
    return `${origin}/raw/${storageId}/${cleanPath}`;
  };

  versionObj.patchUrl = resolveUrl(versionObj.patchUrl);
  versionObj.fullSetupUrl = resolveUrl(versionObj.fullSetupUrl);

  return new Response(JSON.stringify(versionObj, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function onRequestPost(context) {
  const url = new URL(context.request.url);
  const { bucket } = getStorage(context);

  if (!bucket) {
    return new Response(JSON.stringify({ error: "Storage bucket not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  let body;
  try {
    body = await context.request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const app = (body.app || "dy").toLowerCase();
  const version = String(body.version || "").trim();

  if (!version) {
    return new Response(JSON.stringify({ error: "Version number is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const versionPayload = {
    app,
    version,
    minSupportedVersion: body.minSupportedVersion || version,
    patchUrl: body.patchUrl || `/apps/${app}/patch_v${version}.zip`,
    patchMd5: body.patchMd5 || "",
    patchSize: Number(body.patchSize || 0),
    fullSetupUrl: body.fullSetupUrl || `/apps/${app}/天才猫直播助手-Setup-v${version}.exe`,
    forceUpdate: Boolean(body.forceUpdate),
    changelog: body.changelog || "",
    updatedAt: new Date().toISOString(),
  };

  const targetKey = `apps/${app}/version.json`;
  await bucket.put(targetKey, JSON.stringify(versionPayload, null, 2), {
    httpMetadata: {
      contentType: "application/json",
      cacheControl: "no-cache, no-store, must-revalidate",
    },
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: `版本 v${version} 发布成功！已更新至 ${targetKey}`,
      data: versionPayload,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
