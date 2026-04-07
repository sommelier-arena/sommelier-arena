interface Env {
  WINE_ANSWERS_KV: KVNamespace;
  ADMIN_SECRET: string;
}

const VALID_CATEGORIES = [
  "color",
  "region",
  "grape_variety",
  "vintage_year",
  "wine_name",
] as const;

type Category = (typeof VALID_CATEGORIES)[number];

function isValidCategory(value: string): value is Category {
  return VALID_CATEGORIES.includes(value as Category);
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

function authorize(request: Request, env: Env): boolean {
  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  return token === env.ADMIN_SECRET;
}

async function getValues(kv: KVNamespace, category: string): Promise<string[]> {
  const raw = await kv.get(category);
  if (!raw) return [];
  return JSON.parse(raw) as string[];
}

async function handleGetAll(env: Env): Promise<Response> {
  const result: Record<string, string[]> = {};
  for (const cat of VALID_CATEGORIES) {
    result[cat] = await getValues(env.WINE_ANSWERS_KV, cat);
  }
  return jsonResponse(result);
}

async function handleGetCategory(env: Env, category: string): Promise<Response> {
  if (!isValidCategory(category)) {
    return errorResponse(
      `Invalid category "${category}". Valid categories: ${VALID_CATEGORIES.join(", ")}`,
      400,
    );
  }
  const values = await getValues(env.WINE_ANSWERS_KV, category);
  return jsonResponse({ category, values });
}

async function handlePostCategory(
  request: Request,
  env: Env,
  category: string,
): Promise<Response> {
  if (!authorize(request, env)) {
    return errorResponse("Unauthorized", 401);
  }
  if (!isValidCategory(category)) {
    return errorResponse(
      `Invalid category "${category}". Valid categories: ${VALID_CATEGORIES.join(", ")}`,
      400,
    );
  }

  let body: { value?: unknown };
  try {
    body = (await request.json()) as { value?: unknown };
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  if (typeof body.value !== "string" || body.value.trim() === "") {
    return errorResponse('Body must contain a non-empty "value" string', 400);
  }

  const value = body.value.trim();
  const values = await getValues(env.WINE_ANSWERS_KV, category);

  if (values.includes(value)) {
    return errorResponse(`Value "${value}" already exists in "${category}"`, 400);
  }

  values.push(value);
  await env.WINE_ANSWERS_KV.put(category, JSON.stringify(values));

  return jsonResponse({ category, values }, 201);
}

async function handleDeleteValue(
  request: Request,
  env: Env,
  category: string,
  value: string,
): Promise<Response> {
  if (!authorize(request, env)) {
    return errorResponse("Unauthorized", 401);
  }
  if (!isValidCategory(category)) {
    return errorResponse(
      `Invalid category "${category}". Valid categories: ${VALID_CATEGORIES.join(", ")}`,
      400,
    );
  }

  const decodedValue = decodeURIComponent(value);
  const values = await getValues(env.WINE_ANSWERS_KV, category);
  const index = values.indexOf(decodedValue);

  if (index === -1) {
    return errorResponse(
      `Value "${decodedValue}" not found in "${category}"`,
      404,
    );
  }

  values.splice(index, 1);
  await env.WINE_ANSWERS_KV.put(category, JSON.stringify(values));

  return jsonResponse({ category, values });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const segments = url.pathname.replace(/^\/+|\/+$/g, "").split("/");

    // GET /answers
    if (segments[0] === "answers" && segments.length === 1) {
      if (request.method !== "GET") {
        return errorResponse("Method not allowed", 405);
      }
      return handleGetAll(env);
    }

    // GET|POST /answers/:category
    if (segments[0] === "answers" && segments.length === 2) {
      const category = segments[1];
      if (request.method === "GET") return handleGetCategory(env, category);
      if (request.method === "POST")
        return handlePostCategory(request, env, category);
      return errorResponse("Method not allowed", 405);
    }

    // DELETE /answers/:category/:value
    if (segments[0] === "answers" && segments.length === 3) {
      const [, category, value] = segments;
      if (request.method === "DELETE")
        return handleDeleteValue(request, env, category, value);
      return errorResponse("Method not allowed", 405);
    }

    return errorResponse("Not found", 404);
  },
} satisfies ExportedHandler<Env>;
