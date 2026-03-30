async function readJson(request) {
  return new Promise((resolve, reject) => {
    let data = "";
    request.on("data", (chunk) => {
      data += chunk;
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

module.exports = async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { email, username, redirectTo } = await readJson(request);
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedUsername = String(username || "").trim().toLowerCase();
    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      response.status(500).json({ error: "Supabase environment variables are missing" });
      return;
    }

    if (!normalizedEmail) {
      response.status(400).json({ error: "Email is required" });
      return;
    }

    if (normalizedUsername) {
      const profileResponse = await fetch(
        `${supabaseUrl}/rest/v1/profiles?select=email&username=eq.${encodeURIComponent(normalizedUsername)}&limit=1`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        },
      );
      const profiles = await profileResponse.json();
      if (!profileResponse.ok || !profiles.length) {
        response.status(400).json({ error: "Username not found" });
        return;
      }
      if (profiles[0].email !== normalizedEmail) {
        response.status(400).json({ error: "Email and username do not match" });
        return;
      }
    }

    const resetResponse = await fetch(`${supabaseUrl}/auth/v1/recover`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
      },
      body: JSON.stringify({
        email: normalizedEmail,
        redirect_to: redirectTo,
      }),
    });

    const payload = await resetResponse.json();
    if (!resetResponse.ok) {
      response.status(400).json({ error: payload.msg || payload.error_description || "Reset request failed" });
      return;
    }

    response.status(200).json({ ok: true });
  } catch (error) {
    response.status(500).json({ error: error.message || "Reset request failed" });
  }
};
