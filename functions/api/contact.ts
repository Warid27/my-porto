export interface Env {
  TURNSTILE_SECRET_KEY: string;
  CONTACT_FROM_EMAIL: string;
  CONTACT_TO_EMAIL: string;
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitize(value: string, maxLength: number = 5000): string {
  return value.replace(/[\u0000-\u001F\u007F/g, "").trim().slice(0, maxLength);
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
  const current = await kv.get<number>(key, "json");
  const now = Date.now();

  if (!current) {
    await kv.put(key, JSON.stringify({ count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }), {
      expirationTtl: RATE_LIMIT_WINDOW_MS / 1000,
    });
    return { allowed: true };
  }

  const data = JSON.parse(current as unknown as string);
  if (now >= data.resetAt) {
    await kv.put(key, JSON.stringify({ count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }), {
      expirationTtl: RATE_LIMIT_WINDOW_MS / 1000,
    });
    return { allowed: true };
  }

  if (data.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil((data.resetAt - now) / 1000) };
  }

  data.count += 1;
  await kv.put(key, JSON.stringify(data), {
    expirationTtl: Math.ceil((data.resetAt - now) / 1000,
  });
  return { allowed: true };
}

async function sendEmailViaMailChannels(
  fromEmail: string,
  toEmail: string,
  replyToName: string,
  replyToEmail: string,
  subject: string,
  textBody: string
): Promise<Response> {
  const senderName = "Portfolio Contact Form";
  const personalizations = [
    {
      to: [{ email: toEmail }],
      dkim_domain: "",
      dkim_selector: "",
      dkim_private_key: "",
    },
  ];

  const content = {
    from: {
      email: fromEmail,
      name: senderName,
    },
    personalizations,
    subject: `[Portfolio] ${subject}`,
    reply_to: {
      email: replyToEmail,
      name: replyToName,
    },
    content: [
      {
        type: "text/plain",
        value: textBody,
      },
      {
        type: "text/html",
        value: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; background: #F5EFE6; color: #2C2420;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 24px rgba(74, 60, 53, 0.08);">
              <h2 style="margin: 0 0 16px; font-family: 'Cormorant Garamond', serif; color: #2C2420;">New Message from Portfolio</h2>
              <div style="margin-bottom: 20px; padding: 16px; background: #EDE3D5; border-radius: 8px;">
                <p style="margin: 4px 0;"><strong>From:</strong> ${replyToName} &lt;${replyToEmail}&gt;</p>
                <p style="margin: 4px 0;"><strong>Subject:</strong> ${subject}</p>
              </div>
              <div style="white-space: pre-wrap; line-height: 1.6; padding: 16px 0; border-top: 1px solid #EDE3D5; border-bottom: 1px solid #EDE3D5;">
${textBody}
              </div>
            </div>
          </div>
        `,
      },
    ],
  };

  return await fetch("https://api.mailchannels.net/tx/v1/send", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(content),
  });
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

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), {
      status: 405,
      headers,
    });
  }

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

  const fromEmail = env.CONTACT_FROM_EMAIL || "noreply@warid.web.id";
  const toEmail = env.CONTACT_TO_EMAIL || "warid@al-warid.web.id";
  const textBody = `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}\n\n-- \nSent from Portfolio Contact Form\nIP: ${userIp || "unknown"}\nUA: ${userAgent.slice(0, 200)}`;

  try {
    const mailRes = await sendEmailViaMailChannels(
      fromEmail,
      toEmail,
      name,
      email,
      subject,
      textBody
    );

    if (mailRes.ok) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Message sent successfully! I'll get back to you soon. 👋",
        }),
        { status: 200, headers }
      );
    }

    const mailErr = await mailRes.text().catch(() => "");
    console.error("MailChannels error:", mailRes.status, mailErr);

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
