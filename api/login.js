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
    const { login, password } = await readJson(request);
    if (!login || !password) {
      response.status(400).json({ error: "Login and password are required" });
      return;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      response.status(500).json({ error: "Supabase environment variables are missing" });
      return;
    }

    let email = String(login).trim().toLowerCase();

    if (!email.includes("@")) {
      const profileResponse = await fetch(
        `${supabaseUrl}/rest/v1/profiles?select=email&username=eq.${encodeURIComponent(email)}&limit=1`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        },
      );

      const profiles = await profileResponse.json();
      if (!profileResponse.ok || !profiles.length) {
        response.status(401).json({ error: "Invalid username/email or password" });
        return;
      }

      email = profiles[0].email;
    }

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
      },
      body: JSON.stringify({ email, password }),
    });

    const payload = await authResponse.json();
    if (!authResponse.ok) {
      response.status(401).json({ error: payload.msg || payload.error_description || "Login failed" });
      return;
    }

    response.status(200).json({ session: payload });
  } catch (error) {
    response.status(500).json({ error: error.message || "Login failed" });
  }
};
