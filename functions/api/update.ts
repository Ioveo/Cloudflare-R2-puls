import { getStorage } from "@/utils/bucket";

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-storage-id",
    },
  });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const app = (url.searchParams.get("app") || "live").toLowerCase();
  const action = (url.searchParams.get("action") || "").toLowerCase();
  const { bucket, publicUrl, definition } = getStorage(context);

  if (!bucket) {
    return new Response(JSON.stringify({ error: "Storage bucket not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  // 1. 如果请求历史发版记录
  if (action === "history") {
    const historyKey = `apps/${app}/history.json`;
    const histObj = await bucket.get(historyKey);
    let historyList = [];
    if (histObj) {
      try {
        const txt = await histObj.text();
        historyList = JSON.parse(txt);
      } catch (e) {}
    }
    return new Response(JSON.stringify(historyList, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // 2. 正常查询最新版本信息
  const candidateKeys = [
    `apps/${app}/version.json`,
    `${app}-update/version.json`,
    `dy-update/version.json`,
    `version.json`,
  ];

  let versionObj: any = null;
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
        hint: `请先在管理后台或存储桶中上传 apps/${app}/version.json`,
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
      "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function onRequestPost(context) {
  const { bucket } = getStorage(context);

  if (!bucket) {
    return new Response(JSON.stringify({ error: "Storage bucket not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  let body: any;
  try {
    body = await context.request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const app = (body.app || "live").toLowerCase();
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
    appName: body.appName || (app === "live" ? "天才猫极速直播助手" : app === "datacenter" ? "天才猫数据中心" : "天才猫直播助手"),
    minSupportedVersion: body.minSupportedVersion || version,
    patchUrl: body.patchUrl || `/apps/${app}/TianCaiMao.${app === "datacenter" ? "DataCenter" : "LiveAssistant"}.exe`,
    patchMd5: body.patchMd5 || "",
    patchSize: Number(body.patchSize || 0),
    fullSetupUrl: body.fullSetupUrl || `/apps/${app}/${app === "datacenter" ? "天才猫数据中心" : "天才猫极速直播助手"}-Setup-v${version}.exe`,
    forceUpdate: Boolean(body.forceUpdate),
    changelog: body.changelog || "",
    updatedAt: new Date().toISOString(),
  };

  // 1. 写入最新版本配置 apps/${app}/version.json
  const targetKey = `apps/${app}/version.json`;
  await bucket.put(targetKey, JSON.stringify(versionPayload, null, 2), {
    httpMetadata: {
      contentType: "application/json",
      cacheControl: "no-cache, no-store, must-revalidate",
    },
  });

  // 2. 自动归档至历史发版记录 apps/${app}/history.json (保留最近 50 次)
  try {
    const historyKey = `apps/${app}/history.json`;
    const histObj = await bucket.get(historyKey);
    let historyList: any[] = [];
    if (histObj) {
      try {
        historyList = JSON.parse(await histObj.text());
      } catch (e) {}
    }
    // 过滤掉同版本的历史项后插在最前
    historyList = historyList.filter((item: any) => item.version !== version);
    historyList.unshift(versionPayload);
    if (historyList.length > 50) {
      historyList = historyList.slice(0, 50);
    }
    await bucket.put(historyKey, JSON.stringify(historyList, null, 2), {
      httpMetadata: {
        contentType: "application/json",
        cacheControl: "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    console.error("Failed to update history.json:", err);
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: `版本 v${version} 发布成功！已更新至 ${targetKey} 并已同步历史记录。`,
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
