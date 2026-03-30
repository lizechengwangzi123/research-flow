const state = {
  supabase: null,
  authUser: null,
  viewedProfile: null,
  accessibleProfiles: [],
  activeView: "dashboard",
  selectedArticleId: null,
  search: "",
  sort: "submittedDate",
  chart: "status",
  adminUsers: [],
  subscriptions: [],
  isRecoveryFlow: false,
};

const authScreen = document.getElementById("authScreen");
const appShell = document.getElementById("appShell");
const authTabs = document.querySelectorAll(".auth-tab");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const forgotForm = document.getElementById("forgotForm");
const resetForm = document.getElementById("resetForm");
const showForgotButton = document.getElementById("showForgotButton");
const authMessage = document.getElementById("authMessage");
const logoutButton = document.getElementById("logoutButton");
const navLinks = document.querySelectorAll(".nav-link");
const chartTabs = document.querySelectorAll(".chart-tab");
const dashboardView = document.getElementById("dashboardView");
const detailsView = document.getElementById("detailsView");
const statsGrid = document.getElementById("statsGrid");
const chartCard = document.getElementById("chartCard");
const timelineList = document.getElementById("timelineList");
const heroEyebrow = document.getElementById("heroEyebrow");
const heroTitle = document.getElementById("heroTitle");
const heroDescription = document.getElementById("heroDescription");
const heroProfileLabel = document.getElementById("heroProfileLabel");
const heroVisibleArticles = document.getElementById("heroVisibleArticles");
const currentProfileCode = document.getElementById("currentProfileCode");
const currentDisplayName = document.getElementById("currentDisplayName");
const currentUsername = document.getElementById("currentUsername");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const articleList = document.getElementById("articleList");
const articleDetail = document.getElementById("articleDetail");
const articleForm = document.getElementById("articleForm");
const articleFormTitle = document.getElementById("articleFormTitle");
const resetArticleFormButton = document.getElementById("resetArticleFormButton");
const articleMessage = document.getElementById("articleMessage");
const managementPanel = document.getElementById("managementPanel");
const friendForm = document.getElementById("friendForm");
const friendLookup = document.getElementById("friendLookup");
const friendMessage = document.getElementById("friendMessage");
const friendsList = document.getElementById("friendsList");
const rightSidebar = document.getElementById("rightSidebar");
const friendToggle = document.getElementById("friendToggle");
const adminSection = document.getElementById("adminSection");
const loadAdminButton = document.getElementById("loadAdminButton");
const adminMessage = document.getElementById("adminMessage");
const adminUsersTable = document.getElementById("adminUsersTable");

function showMessage(target, message, isError = false) {
  target.style.color = isError ? "#a13e49" : "#2f6fed";
  target.innerHTML = message;
}

async function loadConfig() {
  const response = await fetch("/api/config", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Missing Vercel public config. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return response.json();
}

function switchAuthView(view) {
  authTabs.forEach((button) => button.classList.toggle("is-active", button.dataset.authView === view));
  loginForm.classList.toggle("hidden", view !== "login");
  registerForm.classList.toggle("hidden", view !== "register");
  forgotForm.classList.toggle("hidden", view !== "forgot");
  resetForm.classList.toggle("hidden", view !== "reset");
  authMessage.innerHTML = "";
}

function setView(view) {
  state.activeView = view;
  navLinks.forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
  dashboardView.classList.toggle("hidden", view !== "dashboard");
  detailsView.classList.toggle("hidden", view !== "details");
}

function formatDate(value) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function average(values) {
  const filtered = values.filter((value) => typeof value === "number" && value > 0);
  if (!filtered.length) return 0;
  return Math.round(filtered.reduce((sum, value) => sum + value, 0) / filtered.length);
}

function getStatusTone(status) {
  if (status === "Accepted") return "accepted";
  if (status === "Rejected") return "rejected";
  if (status === "Revision Requested") return "revision";
  if (status === "With Editor") return "editor";
  return "review";
}

function computeStats(articles) {
  return [
    { label: "Total Articles", value: articles.length, subtext: "Tracked submissions" },
    { label: "Avg Publish Time", value: `${average(articles.map((item) => item.publish_days))} days`, subtext: "Submission to publication" },
    { label: "Avg Review Time", value: `${average(articles.map((item) => item.review_days))} days`, subtext: "External review cycle" },
    { label: "Avg Editor Time", value: `${average(articles.map((item) => item.editor_days))} days`, subtext: "Editor handling time" },
    { label: "Accepted", value: articles.filter((item) => item.status === "Accepted").length, subtext: "Successful decisions" },
    { label: "Rejected", value: articles.filter((item) => item.status === "Rejected").length, subtext: "Closed without acceptance" },
    { label: "Under Review", value: articles.filter((item) => item.status === "Under Review").length, subtext: "In reviewer hands" },
    { label: "With Editor", value: articles.filter((item) => item.status === "With Editor").length, subtext: "Editorial screening" },
  ];
}

function groupedStatusCounts(articles) {
  const counts = {};
  articles.forEach((article) => {
    counts[article.status] = (counts[article.status] || 0) + 1;
  });
  return Object.entries(counts);
}

function monthlySubmissionCounts(articles) {
  const map = new Map();
  articles.forEach((article) => {
    const date = new Date(article.submitted_date);
    const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    map.set(label, (map.get(label) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function getFilteredArticles() {
  if (!state.viewedProfile) return [];
  const query = state.search.trim().toLowerCase();
  return [...state.viewedProfile.articles]
    .filter((article) => {
      const haystack = [
        article.title,
        article.journal,
        article.first_author,
        article.corresponding_author,
        article.co_authors,
        article.status,
        article.submitted_date,
        article.decision_date || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    })
    .sort((a, b) => {
      if (state.sort === "submittedDate") return new Date(b.submitted_date) - new Date(a.submitted_date);
      if (state.sort === "firstAuthor") return a.first_author.localeCompare(b.first_author);
      if (state.sort === "correspondingAuthor") return a.corresponding_author.localeCompare(b.corresponding_author);
      if (state.sort === "status") return a.status.localeCompare(b.status);
      return a.journal.localeCompare(b.journal);
    });
}

function renderStats() {
  const stats = computeStats(state.viewedProfile.articles);
  statsGrid.innerHTML = stats
    .map(
      (item) => `
        <article class="metric-card">
          <span class="metric-label">${item.label}</span>
          <strong>${item.value}</strong>
          <p class="metric-subtext">${item.subtext}</p>
        </article>
      `,
    )
    .join("");
}

function renderStatusChart(articles) {
  const data = groupedStatusCounts(articles);
  const max = Math.max(...data.map((item) => item[1]), 1);
  const bars = data
    .map(([label, value], index) => {
      const height = (value / max) * 180;
      const x = 40 + index * 90;
      const y = 220 - height;
      return `
        <rect x="${x}" y="${y}" width="54" height="${height}" rx="12" fill="#2f6fed"></rect>
        <text x="${x + 27}" y="238" text-anchor="middle" font-size="12" fill="#5d675f">${label}</text>
        <text x="${x + 27}" y="${y - 10}" text-anchor="middle" font-size="12" fill="#15324c">${value}</text>
      `;
    })
    .join("");

  return `
    <p class="helper-text">Click the chart tabs to switch metrics.</p>
    <svg class="chart-svg" viewBox="0 0 420 260" role="img" aria-label="Article status bar chart">
      <line x1="30" y1="220" x2="390" y2="220" stroke="#c7d4e6" stroke-width="2"></line>
      ${bars}
    </svg>
    <div class="chart-tooltip">Status totals across the visible profile's article pipeline.</div>
  `;
}

function renderTimelineChart(articles) {
  const data = monthlySubmissionCounts(articles);
  if (!data.length) {
    return "<p class='helper-text'>No submission data yet.</p>";
  }

  const max = Math.max(...data.map((item) => item[1]), 1);
  const points = data
    .map(([, value], index) => {
      const x = 40 + index * (320 / Math.max(data.length - 1, 1));
      const y = 220 - (value / max) * 160;
      return `${x},${y}`;
    })
    .join(" ");

  const labels = data
    .map(([label, value], index) => {
      const x = 40 + index * (320 / Math.max(data.length - 1, 1));
      const y = 220 - (value / max) * 160;
      return `
        <circle cx="${x}" cy="${y}" r="5" fill="#15324c"></circle>
        <text x="${x}" y="242" text-anchor="middle" font-size="11" fill="#5d675f">${label.slice(2)}</text>
        <text x="${x}" y="${y - 10}" text-anchor="middle" font-size="12" fill="#2f6fed">${value}</text>
      `;
    })
    .join("");

  return `
    <svg class="chart-svg" viewBox="0 0 420 260" role="img" aria-label="Submission timeline line chart">
      <line x1="30" y1="220" x2="390" y2="220" stroke="#c7d4e6" stroke-width="2"></line>
      <polyline fill="none" stroke="#2f6fed" stroke-width="4" points="${points}"></polyline>
      ${labels}
    </svg>
    <div class="chart-tooltip">Monthly submission volume over time.</div>
  `;
}

function renderTimingChart(articles) {
  const top = articles.slice(0, 5);
  const max = Math.max(...top.map((item) => Math.max(item.review_days || 0, item.editor_days || 0, 1)), 1);
  const rows = top
    .map(
      (article) => `
        <div class="timing-row">
          <strong>${article.title}</strong>
          <div class="timing-bar-shell">
            <span class="timing-bar review" style="width:${((article.review_days || 0) / max) * 100}%">Review ${article.review_days || 0}d</span>
          </div>
          <div class="timing-bar-shell">
            <span class="timing-bar editor" style="width:${((article.editor_days || 0) / max) * 100}%">Editor ${article.editor_days || 0}d</span>
          </div>
        </div>
      `,
    )
    .join("");

  return `
    <div class="chart-legend">
      <span>Review days</span>
      <span>Editor days</span>
    </div>
    <div class="timing-list">${rows}</div>
    <div class="chart-tooltip">A comparison of review versus editor time for recent articles.</div>
  `;
}

function renderChart() {
  const articles = state.viewedProfile.articles;
  if (state.chart === "status") chartCard.innerHTML = renderStatusChart(articles);
  if (state.chart === "timeline") chartCard.innerHTML = renderTimelineChart(articles);
  if (state.chart === "timing") chartCard.innerHTML = renderTimingChart(articles);
}

function renderTimeline() {
  const items = [...state.viewedProfile.articles]
    .sort((a, b) => new Date(b.decision_date || b.submitted_date) - new Date(a.decision_date || a.submitted_date))
    .slice(0, 6);

  timelineList.innerHTML = items
    .map(
      (article) => `
        <article class="timeline-item">
          <span class="timeline-date">${formatDate(article.decision_date || article.submitted_date)}</span>
          <strong>${article.title}</strong>
          <span class="status-chip" data-tone="${getStatusTone(article.status)}">${article.status}</span>
          <span class="muted">${article.journal}</span>
        </article>
      `,
    )
    .join("");
}

function populateArticleForm(article) {
  articleFormTitle.textContent = article ? "Edit selected article record" : "Add a new article record";
  articleForm.elements.id.value = article?.id || "";
  articleForm.elements.title.value = article?.title || "";
  articleForm.elements.journal.value = article?.journal || "";
  articleForm.elements.submittedDate.value = article?.submitted_date || "";
  articleForm.elements.firstAuthor.value = article?.first_author || "";
  articleForm.elements.correspondingAuthor.value = article?.corresponding_author || "";
  articleForm.elements.status.value = article?.status || "Under Review";
  articleForm.elements.reviewDays.value = article?.review_days ?? "";
  articleForm.elements.editorDays.value = article?.editor_days ?? "";
  articleForm.elements.publishDays.value = article?.publish_days ?? "";
  articleForm.elements.decisionDate.value = article?.decision_date || "";
  articleForm.elements.revisionRound.value = article?.revision_round || "";
  articleForm.elements.manuscriptType.value = article?.manuscript_type || "";
  articleForm.elements.coAuthors.value = article?.co_authors || "";
  articleForm.elements.notes.value = article?.notes || "";
}

function renderArticleDetail(article) {
  if (!article) {
    articleDetail.innerHTML = `
      <p class="section-label">Article Record</p>
      <h3>No matching article</h3>
      <p class="muted">Try a broader search or switch to a different profile.</p>
    `;
    return;
  }

  articleDetail.innerHTML = `
    <p class="section-label">Article Record</p>
    <div class="article-topline">
      <div>
        <h3>${article.title}</h3>
        <p class="detail-inline">${article.journal}</p>
      </div>
      <span class="status-chip" data-tone="${getStatusTone(article.status)}">${article.status}</span>
    </div>
    <div class="detail-grid">
      <div class="detail-item">
        <span class="detail-label">Article ID</span>
        <strong class="detail-value">${article.article_code}</strong>
      </div>
      <div class="detail-item">
        <span class="detail-label">Submitted</span>
        <strong class="detail-value">${formatDate(article.submitted_date)}</strong>
      </div>
      <div class="detail-item">
        <span class="detail-label">First Author</span>
        <strong class="detail-value">${article.first_author}</strong>
      </div>
      <div class="detail-item">
        <span class="detail-label">Corresponding Author</span>
        <strong class="detail-value">${article.corresponding_author}</strong>
      </div>
      <div class="detail-item">
        <span class="detail-label">Review Time</span>
        <strong class="detail-value">${article.review_days ?? 0} days</strong>
      </div>
      <div class="detail-item">
        <span class="detail-label">Editor Time</span>
        <strong class="detail-value">${article.editor_days ?? 0} days</strong>
      </div>
      <div class="detail-item">
        <span class="detail-label">Publish Time</span>
        <strong class="detail-value">${article.publish_days ? `${article.publish_days} days` : "Pending"}</strong>
      </div>
      <div class="detail-item">
        <span class="detail-label">Decision Date</span>
        <strong class="detail-value">${formatDate(article.decision_date)}</strong>
      </div>
    </div>
    <div class="detail-block">
      <p class="detail-label">Manuscript Type</p>
      <p class="detail-inline">${article.manuscript_type || "Not set"}</p>
      <p class="detail-label">Revision Stage</p>
      <p class="detail-inline">${article.revision_round || "Not set"}</p>
      <p class="detail-label">Authors</p>
      <p class="detail-inline">${article.co_authors || "Not set"}</p>
      <p class="detail-label">Notes</p>
      <p class="detail-inline">${article.notes || "No notes"}</p>
    </div>
  `;
}

function renderArticleList() {
  const filtered = getFilteredArticles();
  heroVisibleArticles.textContent = String(filtered.length);

  if (!filtered.length) {
    articleList.innerHTML = `
      <article class="article-card">
        <h4>No articles found</h4>
        <p class="muted">Try a different search term or sorting mode.</p>
      </article>
    `;
    renderArticleDetail(null);
    return;
  }

  if (!state.selectedArticleId || !filtered.some((article) => article.id === state.selectedArticleId)) {
    state.selectedArticleId = filtered[0].id;
  }

  const viewingMine = state.viewedProfile.username === state.authUser.username;
  articleList.innerHTML = filtered
    .map(
      (article) => `
        <article class="article-card ${article.id === state.selectedArticleId ? "is-selected" : ""}" data-article-id="${article.id}">
          <div class="article-topline">
            <div>
              <h4>${article.title}</h4>
              <p class="detail-inline">${article.journal}</p>
            </div>
            <span class="status-chip" data-tone="${getStatusTone(article.status)}">${article.status}</span>
          </div>
          <div class="article-meta">
            <span>Submitted ${formatDate(article.submitted_date)}</span>
            <span>First author: ${article.first_author}</span>
            <span>Corr. author: ${article.corresponding_author}</span>
            ${viewingMine ? "<span>Click to edit</span>" : ""}
          </div>
        </article>
      `,
    )
    .join("");

  const selected = filtered.find((article) => article.id === state.selectedArticleId);
  renderArticleDetail(selected);
  if (viewingMine) populateArticleForm(selected);

  document.querySelectorAll("[data-article-id]").forEach((card) => {
    card.addEventListener("click", () => {
      state.selectedArticleId = Number(card.dataset.articleId);
      const article = state.viewedProfile.articles.find((item) => item.id === state.selectedArticleId);
      renderArticleList();
      if (viewingMine) populateArticleForm(article);
    });
  });
}

function renderFriends() {
  friendsList.innerHTML = state.accessibleProfiles
    .map(
      (profile) => `
        <article class="friend-card">
          <header>
            <div>
              <span class="profile-chip">${profile.public_id}</span>
              <h4>${profile.display_name}</h4>
            </div>
            <button type="button" data-username="${profile.username}">
              ${state.viewedProfile.username === profile.username ? "Viewing" : profile.username === state.authUser.username ? "View mine" : "View"}
            </button>
          </header>
          <p class="muted">@${profile.username}</p>
          <div class="friend-summary">
            <span>${profile.article_count} articles</span>
            <span>${profile.accepted_count} accepted</span>
            <span>${profile.active_count} active</span>
          </div>
        </article>
      `,
    )
    .join("");

  document.querySelectorAll("[data-username]").forEach((button) => {
    button.addEventListener("click", async () => {
      await loadProfile(button.dataset.username);
    });
  });
}

function renderAdminUsers() {
  if (!state.adminUsers.length) {
    adminUsersTable.innerHTML = "<p class='helper-text'>No users loaded yet.</p>";
    return;
  }

  adminUsersTable.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Public ID</th>
          <th>Username</th>
          <th>Email</th>
          <th>Admin</th>
          <th>Articles</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        ${state.adminUsers
          .map(
            (user) => `
              <tr>
                <td>${user.public_id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.is_admin ? "Yes" : "No"}</td>
                <td>${user.article_count}</td>
                <td>${formatDate(user.created_at)}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

async function fetchOwnProfile(userId) {
  if (!userId) {
    throw new Error("No authenticated user id was provided.");
  }

  const { data, error } = await state.supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  if (!data) throw new Error("Your profile record was not found.");
  return data;
}

async function fetchAccessibleProfiles() {
  const { data, error } = await state.supabase.rpc("get_accessible_profiles");
  if (error) throw error;
  return data || [];
}

async function fetchProfileByUsername(username) {
  const { data: profile, error: profileError } = await state.supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();
  if (profileError) throw profileError;

  const { data: articles, error: articleError } = await state.supabase
    .from("articles")
    .select("*")
    .eq("user_id", profile.id)
    .order("submitted_date", { ascending: false });
  if (articleError) throw articleError;

  return { ...profile, articles: articles || [] };
}

async function loadProfile(username) {
  state.viewedProfile = await fetchProfileByUsername(username);
  state.selectedArticleId = state.viewedProfile.articles[0]?.id || null;
  renderProfile();
}

function renderProfile() {
  const viewingMine = state.viewedProfile.username === state.authUser.username;
  heroEyebrow.textContent = viewingMine ? "My Dashboard" : "Friend Dashboard";
  heroTitle.textContent = viewingMine ? "Submission Insights" : `${state.viewedProfile.display_name}'s Research Progress`;
  heroDescription.textContent = viewingMine
    ? "Review your publication pipeline, interactive metrics, and editorial decision timing across journals."
    : "Inspect your friend's dashboard statistics and article progress.";
  heroProfileLabel.textContent = state.viewedProfile.username;
  currentProfileCode.textContent = state.authUser.public_id;
  currentDisplayName.textContent = state.authUser.display_name;
  currentUsername.textContent = `@${state.authUser.username}`;
  managementPanel.classList.toggle("hidden", !viewingMine);
  adminSection.classList.toggle("hidden", !state.authUser.is_admin);
  renderStats();
  renderChart();
  renderTimeline();
  renderArticleList();
  renderFriends();
}

async function loadSession() {
  const {
    data: { session },
  } = await state.supabase.auth.getSession();

  if (!session) {
    authScreen.classList.remove("hidden");
    appShell.classList.add("hidden");
    return;
  }

  if (state.isRecoveryFlow) {
    authScreen.classList.remove("hidden");
    appShell.classList.add("hidden");
    switchAuthView("reset");
    showMessage(authMessage, "Create a new password for your account.");
    return;
  }

  authScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
  state.authUser = await fetchOwnProfile(session.user.id);
  state.accessibleProfiles = await fetchAccessibleProfiles();
  await loadProfile(state.authUser.username);
}

function resetArticleFormToNew() {
  populateArticleForm(null);
  articleMessage.innerHTML = "";
}

function authRedirectUrl() {
  return window.location.origin;
}

function subscribeRealtime() {
  state.subscriptions.forEach((channel) => state.supabase.removeChannel(channel));
  state.subscriptions = [];

  const channel = state.supabase
    .channel("research-flow-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "articles" }, async () => {
      if (state.authUser) {
        state.accessibleProfiles = await fetchAccessibleProfiles();
        await loadProfile(state.viewedProfile?.username || state.authUser.username);
      }
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, async () => {
      if (state.authUser) {
        state.accessibleProfiles = await fetchAccessibleProfiles();
        renderFriends();
      }
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, async () => {
      if (state.authUser) {
        const {
          data: { session },
        } = await state.supabase.auth.getSession();
        if (!session) return;
        state.authUser = await fetchOwnProfile(session.user.id);
        state.accessibleProfiles = await fetchAccessibleProfiles();
        await loadProfile(state.viewedProfile?.username || state.authUser.username);
      }
    })
    .subscribe();

  state.subscriptions.push(channel);
}

async function initializeSupabase() {
  const config = await loadConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error("Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel project settings.");
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  state.isRecoveryFlow =
    hashParams.get("type") === "recovery" ||
    window.location.search.includes("type=recovery");

  state.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  state.supabase.auth.onAuthStateChange(async (event) => {
    if (event === "PASSWORD_RECOVERY") {
      state.isRecoveryFlow = true;
      switchAuthView("reset");
      showMessage(authMessage, "Create a new password for your account.");
      return;
    }

    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      try {
        await loadSession();
        subscribeRealtime();
      } catch (error) {
        authScreen.classList.remove("hidden");
        appShell.classList.add("hidden");
        showMessage(authMessage, error.message || "Signed in, but failed to load your profile.", true);
      }
      return;
    }

    if (event === "SIGNED_OUT") {
      authScreen.classList.remove("hidden");
      appShell.classList.add("hidden");
      switchAuthView("login");
    }
  });

  try {
    await loadSession();
    if (state.authUser) subscribeRealtime();
  } catch (error) {
    authScreen.classList.remove("hidden");
    appShell.classList.add("hidden");
    showMessage(authMessage, error.message || "Failed to load your profile.", true);
  }
}

authTabs.forEach((button) => {
  button.addEventListener("click", () => switchAuthView(button.dataset.authView));
});

showForgotButton.addEventListener("click", () => switchAuthView("forgot"));

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const login = String(formData.get("login") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  try {
    showMessage(authMessage, "Logging in...");

    if (login.includes("@")) {
      const { error } = await state.supabase.auth.signInWithPassword({
        email: login,
        password,
      });
      if (error) throw error;
    } else {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Login failed");

      const { error } = await state.supabase.auth.setSession({
        access_token: payload.session.access_token,
        refresh_token: payload.session.refresh_token,
      });
      if (error) throw error;
    }

    loginForm.reset();
  } catch (error) {
    showMessage(authMessage, error.message, true);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const displayName = String(formData.get("displayName") || "").trim();

  try {
    const { error } = await state.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: authRedirectUrl(),
        data: {
          username,
          display_name: displayName,
        },
      },
    });
    if (error) throw error;
    registerForm.reset();
    showMessage(authMessage, "Account created. Check your email to verify before logging in.");
    switchAuthView("login");
  } catch (error) {
    showMessage(authMessage, error.message, true);
  }
});

forgotForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(forgotForm);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const username = String(formData.get("username") || "").trim().toLowerCase();

  try {
    const response = await fetch("/api/request-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        username,
        redirectTo: authRedirectUrl(),
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Reset request failed");
    forgotForm.reset();
    showMessage(authMessage, "Reset email sent. Check your inbox.");
  } catch (error) {
    showMessage(authMessage, error.message, true);
  }
});

resetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(resetForm);
  const password = String(formData.get("password") || "");

  try {
    const { error } = await state.supabase.auth.updateUser({ password });
    if (error) throw error;
    resetForm.reset();
    state.isRecoveryFlow = false;
    await state.supabase.auth.signOut();
    showMessage(authMessage, "Password updated. You can continue using the app.");
    switchAuthView("login");
  } catch (error) {
    showMessage(authMessage, error.message, true);
  }
});

logoutButton.addEventListener("click", async () => {
  await state.supabase.auth.signOut();
});

navLinks.forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));

chartTabs.forEach((button) => {
  button.addEventListener("click", () => {
    state.chart = button.dataset.chart;
    chartTabs.forEach((item) => item.classList.toggle("is-active", item === button));
    renderChart();
  });
});

searchInput.addEventListener("input", () => {
  state.search = searchInput.value;
  renderArticleList();
});

sortSelect.addEventListener("change", () => {
  state.sort = sortSelect.value;
  renderArticleList();
});

resetArticleFormButton.addEventListener("click", resetArticleFormToNew);

articleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(articleForm);
  const payload = {
    user_id: state.authUser.id,
    title: String(formData.get("title") || "").trim(),
    journal: String(formData.get("journal") || "").trim(),
    submitted_date: formData.get("submittedDate"),
    first_author: String(formData.get("firstAuthor") || "").trim(),
    corresponding_author: String(formData.get("correspondingAuthor") || "").trim(),
    status: formData.get("status"),
    review_days: Number(formData.get("reviewDays") || 0),
    editor_days: Number(formData.get("editorDays") || 0),
    publish_days: formData.get("publishDays") ? Number(formData.get("publishDays")) : null,
    decision_date: formData.get("decisionDate") || null,
    revision_round: String(formData.get("revisionRound") || "").trim() || null,
    manuscript_type: String(formData.get("manuscriptType") || "").trim() || null,
    co_authors: String(formData.get("coAuthors") || "").trim() || null,
    notes: String(formData.get("notes") || "").trim() || null,
  };

  try {
    const articleId = formData.get("id");
    if (articleId) {
      const { error } = await state.supabase.from("articles").update(payload).eq("id", Number(articleId)).eq("user_id", state.authUser.id);
      if (error) throw error;
    } else {
      const { error } = await state.supabase.from("articles").insert(payload);
      if (error) throw error;
    }

    showMessage(articleMessage, "Article saved.");
    state.accessibleProfiles = await fetchAccessibleProfiles();
    await loadProfile(state.authUser.username);
    resetArticleFormToNew();
  } catch (error) {
    showMessage(articleMessage, error.message, true);
  }
});

friendForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const lookup = friendLookup.value.trim();
    const { error } = await state.supabase.rpc("add_friend_by_username", {
      lookup_text: lookup,
    });
    if (error) throw error;
    friendLookup.value = "";
    showMessage(friendMessage, "Friend added.");
    state.accessibleProfiles = await fetchAccessibleProfiles();
    renderFriends();
  } catch (error) {
    showMessage(friendMessage, error.message, true);
  }
});

friendToggle.addEventListener("click", () => {
  const collapsed = rightSidebar.classList.toggle("is-collapsed");
  friendToggle.setAttribute("aria-expanded", String(!collapsed));
});

loadAdminButton.addEventListener("click", async () => {
  try {
    const { data, error } = await state.supabase.rpc("admin_list_profiles");
    if (error) throw error;
    state.adminUsers = data || [];
    renderAdminUsers();
    showMessage(adminMessage, "Loaded user overview.");
  } catch (error) {
    showMessage(adminMessage, error.message, true);
  }
});

setView("dashboard");
initializeSupabase().catch((error) => {
  showMessage(authMessage, error.message, true);
  switchAuthView("login");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
