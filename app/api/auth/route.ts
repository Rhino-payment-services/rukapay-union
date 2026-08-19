const API_BASE = process.env.RUKAPAY_API_URL || "https://api.rukapay.net";

export async function POST(request: Request) {
  const { action, ...body } = await request.json();

  const endpoints: Record<string, { path: string; method: string }> = {
    "check-phone": { path: "/auth/app/phone-login-preview", method: "POST" },
    "check-username": {
      path: `/auth/wallet-username/check?username=${encodeURIComponent(body.username || "")}`,
      method: "GET",
    },
    register: { path: "/auth/register", method: "POST" },
    "send-otp": { path: "/sms/send-otp", method: "POST" },
    "verify-otp": { path: "/sms/verify-otp", method: "POST" },
    "resend-otp": { path: "/auth/resend-otp", method: "POST" },
  };

  const endpoint = endpoints[action];
  if (!endpoint) {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const fetchOptions: RequestInit = {
      method: endpoint.method,
      headers: { "Content-Type": "application/json" },
    };
    if (endpoint.method !== "GET") {
      fetchOptions.body = JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${endpoint.path}`, fetchOptions);
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch {
    return Response.json(
      { error: "Failed to connect to RukaPay API" },
      { status: 502 }
    );
  }
}
