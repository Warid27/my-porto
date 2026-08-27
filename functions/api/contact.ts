export interface Env {
  WEB3FORMS_ACCESS_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  RATE_LIMIT?: KVNamespace;
}

const RATE_LIMIT_KEY_PREFIX = "contact_rate_limit_";
const RATE_LIMIT_WINDOW_MS = 60_000 * 5;
const RATE_LIMIT_MAX_REQUESTS = 3;

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  botcheck?: string;
  "cf-turnstile-response"?: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitize(value: string, maxLength: number = 5000): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, maxLength);
}

async function verifyTurnstile(
  token: string | undefined,
  secretKey: string,
  userIp: string | null
): Promise<boolean> {
  if (!token) return false;

  const formData = new FormData();
  formData.append("secret", secretKey);
  formData.append("response", token);
  if (userIp) {
    formData.append("remoteip", userIp);
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: formData,
    }
  );

  const outcome = await response.json<{ success: boolean; "error-codes"?: string[] }>();
  return outcome.success === true;
}

async function checkRateLimit(
  kv: KVNamespace | undefined,
  identifier: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  if (!kv) return { allowed: true };

  const key = RATE_LIMIT_KEY_PREFIX + identifier;
  const now = Date.now();
  // kv.get with "json" already parses the stored JSON — do not JSON.parse again
  const current = await kv.get<RateLimitEntry>(key, "json");

  if (!current || now >= current.resetAt) {
    await kv.put(key, JSON.stringify({ count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }), {
      expirationTtl: RATE_LIMIT_WINDOW_MS / 1000,
    });
    return { allowed: true };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  }

  current.count += 1;
  await kv.put(key, JSON.stringify(current), {
    expirationTtl: Math.ceil((current.resetAt - now) / 1000),
  });
  return { allowed: true };
}

async function sendViaWeb3Forms(
  accessKey: string,
  name: string,
  email: string,
  subject: string,
  message: string
): Promise<{ ok: boolean; errorMessage?: string }> {
  const response = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      access_key: accessKey,
      subject: `[Portfolio] ${subject}`,
      from_name: `${name} — Portfolio Contact Form`,
      name,
      email,
      message,
    }),
  });

  const result = await response
    .json<{ success: boolean; message?: string }>()
    .catch(() => ({ success: false, message: "Unexpected response from email provider" }));

  if (response.ok && result.success) {
    return { ok: true };
  }
  return { ok: false, errorMessage: result.message };
}

export async function onRequestPost(context: EventContext<Env, any, Record<string, unknown>>) {
  const { request, env } = context;
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  });

  const userIp = request.headers.get("CF-Connecting-IP");
  const userAgent = request.headers.get("User-Agent") || "";

  const contentType = request.headers.get("content-type") || "";

  let formData: ContactFormData;
  try {
    if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const fd = await request.formData();
      formData = Object.fromEntries(fd.entries()) as unknown as ContactFormData;
    } else {
      formData = await request.json<ContactFormData>();
    }
  } catch {
    return new Response(JSON.stringify({ success: false, message: "Invalid request body" }), {
      status: 400,
      headers,
    });
  }

  if (formData.botcheck && formData.botcheck !== "") {
    return new Response(JSON.stringify({ success: true, message: "Message received" }), {
      status: 200,
      headers,
    });
  }

  const name = sanitize(formData.name || "", 100);
  const email = sanitize(formData.email || "", 254);
  const subject = sanitize(formData.subject || "No Subject", 200);
  const message = sanitize(formData.message || "", 5000);

  if (!name || name.length < 2) {
    return new Response(JSON.stringify({ success: false, message: "Name is required (min 2 chars)" }), {
      status: 400,
      headers,
    });
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    return new Response(JSON.stringify({ success: false, message: "Valid email is required" }), {
      status: 400,
      headers,
    });
  }

  if (!message || message.length < 10) {
    return new Response(JSON.stringify({ success: false, message: "Message is required (min 10 chars)" }), {
      status: 400,
      headers,
    });
  }

  const turnstileSecret = env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret && turnstileSecret !== "") {
    const turnstileOk = await verifyTurnstile(
      formData["cf-turnstile-response"],
      turnstileSecret,
      userIp
    );
    if (!turnstileOk) {
      return new Response(JSON.stringify({ success: false, message: "Captcha verification failed. Please try again." }), {
        status: 400,
        headers,
      });
    }
  }

  const rateLimitId = userIp || email || userAgent.slice(0, 50);
  const rate = await checkRateLimit(env.RATE_LIMIT, rateLimitId);
  if (!rate.allowed) {
    headers.set("Retry-After", String(rate.retryAfter || 300));
    return new Response(
      JSON.stringify({
        success: false,
        message: `Too many requests. Please try again in ${rate.retryAfter || 5} minutes.`,
      }),
      { status: 429, headers }
    );
  }

  const accessKey = env.WEB3FORMS_ACCESS_KEY;
  if (!accessKey || accessKey === "") {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Contact form is not configured yet. Please email me directly instead.",
      }),
      { status: 500, headers }
    );
  }

  try {
    const result = await sendViaWeb3Forms(accessKey, name, email, subject, message);

    if (result.ok) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Message sent successfully! I'll get back to you soon. 👋",
        }),
        { status: 200, headers }
      );
    }

    console.error("Web3Forms error:", result.errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to send message. Please try again later or email me directly.",
      }),
      { status: 502, headers }
    );
  } catch (err) {
    console.error("Email send error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Server error. Please try again later or email me directly.",
      }),
      { status: 500, headers }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}
