const SUPABASE_BASE = "https://vgdtywdpywezrwlrsawq.supabase.co";
const SUPABASE_KEY = "sb_publishable_dmoTPKmglghAohv0MrRA9A_2zlUYhER";
const PANEL_ORIGIN = "https://marcelocrediti.github.io";
const MAX_FILE_SIZE = 30 * 1024 * 1024;

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = origin === PANEL_ORIGIN ? origin : PANEL_ORIGIN;

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-File-Name",
    "Access-Control-Expose-Headers": "Content-Disposition, Content-Length, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function validKey(key) {
  return Boolean(
    key &&
    key.length <= 500 &&
    !key.startsWith("/") &&
    !key.includes("..") &&
    !key.includes("\\")
  );
}

function safeFileName(value = "arquivo") {
  let decoded = value;

  try {
    decoded = decodeURIComponent(value);
  } catch (_) {
    decoded = value;
  }

  return String(decoded)
    .replace(/[\r\n"]/g, "_")
    .trim()
    .slice(0, 180) || "arquivo";
}

async function verifyUser(request) {
  const authorization = request.headers.get("Authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  const response = await fetch(`${SUPABASE_BASE}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: authorization
    }
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function calculateUsage(bucket) {
  let cursor;
  let totalBytes = 0;
  let totalFiles = 0;

  do {
    const page = await bucket.list({
      cursor,
      limit: 1000
    });

    for (const object of page.objects) {
      totalBytes += object.size || 0;
      totalFiles += 1;
    }

    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  const limitBytes = 10 * 1024 * 1024 * 1024;

  return {
    totalBytes,
    totalFiles,
    limitBytes,
    percentUsed: Number(((totalBytes / limitBytes) * 100).toFixed(2))
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request)
      });
    }

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json(request, {
        ok: true,
        service: "Crediti Arquivos API"
      });
    }

    const user = await verifyUser(request);

    if (!user) {
      return json(request, {
        error: "Acesso não autorizado. Entre novamente no Painel Crediti."
      }, 401);
    }

    if (request.method === "GET" && url.pathname === "/usage") {
      return json(request, await calculateUsage(env.DOCUMENTOS));
    }

    if (request.method === "GET" && url.pathname === "/files") {
      const prefix = url.searchParams.get("prefix") || "";

      if (prefix && !validKey(prefix)) {
        return json(request, { error: "Pasta inválida." }, 400);
      }

      const result = await env.DOCUMENTOS.list({
        prefix,
        limit: 1000
      });

      return json(request, {
        files: result.objects.map((object) => ({
          key: object.key,
          size: object.size,
          uploaded: object.uploaded,
          etag: object.etag
        }))
      });
    }

    if (request.method === "POST" && url.pathname === "/upload") {
      const key = url.searchParams.get("key") || "";
      const contentLength = Number(request.headers.get("Content-Length") || 0);

      if (!validKey(key)) {
        return json(request, { error: "Caminho do arquivo inválido." }, 400);
      }

      if (!request.body) {
        return json(request, { error: "Nenhum arquivo foi enviado." }, 400);
      }

      if (contentLength > MAX_FILE_SIZE) {
        return json(request, {
          error: "O arquivo ultrapassa o limite de 30 MB."
        }, 413);
      }

      const contentType = request.headers.get("Content-Type") || "application/octet-stream";
      const originalName = safeFileName(request.headers.get("X-File-Name") || key.split("/").pop());

      await env.DOCUMENTOS.put(key, request.body, {
        httpMetadata: {
          contentType,
          contentDisposition: `inline; filename="${originalName}"`
        },
        customMetadata: {
          originalName,
          uploadedBy: user.email || user.id || "painel",
          uploadedAt: new Date().toISOString()
        }
      });

      const object = await env.DOCUMENTOS.head(key);

      return json(request, {
        ok: true,
        key,
        size: object?.size || contentLength,
        contentType,
        originalName
      }, 201);
    }

    if (request.method === "GET" && url.pathname === "/file") {
      const key = url.searchParams.get("key") || "";
      const shouldDownload = url.searchParams.get("download") === "1";

      if (!validKey(key)) {
        return json(request, { error: "Caminho do arquivo inválido." }, 400);
      }

      const object = await env.DOCUMENTOS.get(key);

      if (!object) {
        return json(request, { error: "Arquivo não encontrado." }, 404);
      }

      const headers = new Headers(corsHeaders(request));
      object.writeHttpMetadata(headers);
      headers.set("ETag", object.httpEtag);
      headers.set("Cache-Control", "private, no-store");

      const originalName = safeFileName(
        object.customMetadata?.originalName || key.split("/").pop()
      );

      headers.set(
        "Content-Disposition",
        `${shouldDownload ? "attachment" : "inline"}; filename="${originalName}"`
      );

      return new Response(object.body, { headers });
    }

    if (request.method === "DELETE" && url.pathname === "/file") {
      const key = url.searchParams.get("key") || "";

      if (!validKey(key)) {
        return json(request, { error: "Caminho do arquivo inválido." }, 400);
      }

      await env.DOCUMENTOS.delete(key);

      return json(request, { ok: true, key });
    }

    return json(request, { error: "Rota não encontrada." }, 404);
  }
};
