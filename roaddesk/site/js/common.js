"use strict";

/* ===== 1. Safety checks on config.js ===== */
(function checkConfig() {
  function fatal(text) {
    const bar = document.createElement("div");
    bar.className = "config-error";
    bar.setAttribute("role", "alert");
    bar.textContent = text;
    document.body.prepend(bar);
  }
  const url = APP_CONFIG.SUPABASE_URL || "";
  const key = APP_CONFIG.SUPABASE_ANON_KEY || "";
  if (url.includes("YOUR-") || key.includes("YOUR-")) {
    fatal("This site is not configured yet. Fill in js/config.js.");
    throw new Error("Not configured: edit js/config.js");
  }
  let secret = key.startsWith("sb_secret_");
  try {
    const part = key.split(".")[1];
    if (part) {
      const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
      if (json.role === "service_role") secret = true;
    }
  } catch (e) { /* not a JWT, that is fine */ }
  if (secret) {
    fatal("A secret key was found in config.js. Remove it and rotate it in Supabase now.");
    throw new Error("Secret key in browser code");
  }
})();

/* ===== 2. Supabase client (anon key only; Row Level Security protects the data) ===== */
const db = window.supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

/* ===== 3. Constants and labels ===== */
const CATEGORY_LABELS = {
  pothole: "Pothole",
  crack: "Crack or surface damage",
  waterlogging: "Waterlogging",
  missing_cover: "Missing manhole or drain cover",
  damaged_divider: "Damaged divider",
  signage: "Damaged or missing signage",
  other: "Other"
};
const SEVERITY_LABELS = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };
const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };
const SEVERITY_COLORS = { low: "#3fb871", medium: "#f0c419", high: "#f08a24", critical: "#ff5a4f" };
const STATUS_LABELS = {
  reported: "Reported",
  verified: "Verified",
  assigned: "Assigned",
  in_progress: "In progress",
  resolved: "Resolved",
  rejected: "Rejected"
};
const OPEN_STATUSES = ["reported", "verified", "assigned", "in_progress"];

/* ===== 4. Safe DOM helper. Never uses innerHTML, so user text cannot run as code (XSS). ===== */
function h(tag, props, ...children) {
  const node = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.startsWith("on")) {
        if (typeof value === "function") node.addEventListener(key.slice(2), value);
      } else node.setAttribute(key, value === true ? "" : String(value));
    }
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/* Trim, remove control characters and cap the length. Used on every text input. */
function clean(value, max) {
  return String(value || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

function showMsg(el, kind, content) {
  el.className = "msg " + kind;
  el.replaceChildren();
  if (Array.isArray(content)) {
    el.append(h("ul", null, content.map((t) => h("li", { text: t }))));
  } else {
    el.textContent = content;
  }
  el.hidden = false;
}
function hideMsg(el) { el.hidden = true; el.replaceChildren(); }

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function severityBadge(sev) {
  return h("span", { class: "badge sev-" + sev }, h("span", { class: "dot", "aria-hidden": "true" }), SEVERITY_LABELS[sev] || sev);
}
function statusBadge(st) {
  return h("span", { class: "badge st-" + st }, h("span", { class: "dot", "aria-hidden": "true" }), STATUS_LABELS[st] || st);
}

function photoUrl(path) {
  if (!path) return null;
  return db.storage.from("report-images").getPublicUrl(path).data.publicUrl;
}

/* ===== 5. Spam protection: Cloudflare Turnstile (only if a site key is set) ===== */
function setupCaptcha(containerId) {
  const key = APP_CONFIG.TURNSTILE_SITE_KEY;
  if (!key) return { getToken: () => undefined, reset: () => {} };
  let token;
  const s = document.createElement("script");
  s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  s.async = true;
  s.onload = () => {
    window.turnstile.render("#" + containerId, {
      sitekey: key,
      callback: (t) => { token = t; },
      "expired-callback": () => { token = undefined; }
    });
  };
  document.head.appendChild(s);
  return {
    getToken: () => token,
    reset: () => { token = undefined; if (window.turnstile) window.turnstile.reset(); }
  };
}

/* ===== 6. Session, roles and page guards =====
   The guards below only decide what a visitor SEES. The real protection is Row Level
   Security in the database (supabase/02_security.sql). */
async function loadProfile(userId) {
  const { data, error } = await db.from("profiles").select("id, full_name, role").eq("id", userId).single();
  return error ? null : data;
}

async function initPage(options) {
  const need = options && options.require;
  const { data } = await db.auth.getSession();
  const user = data.session ? data.session.user : null;
  const profile = user ? await loadProfile(user.id) : null;

  if (need === "user" && !user) { location.replace("/login.html"); return null; }
  if (need === "admin" && (!profile || profile.role !== "admin")) {
    location.replace(user ? "/" : "/login.html");
    return null;
  }

  const state = !user ? "guest" : profile && profile.role === "admin" ? "admin" : "user";
  document.querySelectorAll("[data-show]").forEach((node) => {
    const wants = node.getAttribute("data-show").split(" ");
    const visible = wants.includes(state) || (state === "admin" && wants.includes("user"));
    node.hidden = !visible;
  });
  const logout = document.getElementById("logout-btn");
  if (logout) {
    logout.addEventListener("click", async () => {
      await db.auth.signOut();
      location.href = "/";
    });
  }
  const here = location.pathname.replace(/\/index\.html$/, "/");
  document.querySelectorAll(".nav-list a, .subnav a").forEach((a) => {
    if (a.getAttribute("href") && new URL(a.href).pathname.replace(/\/index\.html$/, "/") === here) {
      a.setAttribute("aria-current", "page");
    }
  });
  document.body.classList.remove("gated");
  return { user, profile };
}

/* ===== 7. Maps (Leaflet + OpenStreetMap tiles) ===== */
function createMap(elementId, center, zoom) {
  const map = L.map(elementId, { center, zoom });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  return map;
}
function severityMarker(lat, lng, severity) {
  return L.circleMarker([lat, lng], {
    radius: 9, color: "#ffffff", weight: 2,
    fillColor: SEVERITY_COLORS[severity] || "#999999", fillOpacity: 0.95
  });
}

/* ===== 8. Password rule shared by register and reset pages ===== */
function passwordProblem(pw) {
  if (pw.length < 10) return "Use at least 10 characters in your password.";
  if (pw.length > 72) return "Use at most 72 characters in your password.";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Your password must contain at least one letter and one number.";
  return null;
}
