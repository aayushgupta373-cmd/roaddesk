"use strict";
(async function () {
  const ctx = await initPage({ require: "admin" });
  if (!ctx) return;

  const { data, error } = await db
    .from("reports")
    .select("id, title, category, severity, status, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  const stats = document.getElementById("stats");
  const content = document.getElementById("dash-content");
  if (error) {
    stats.replaceChildren(h("p", { class: "msg error", role: "alert", text: "Reports could not be loaded. Refresh and try again." }));
    return;
  }
  if (!data.length) {
    stats.replaceChildren(h("div", { class: "glass empty" }, h("p", { text: "No reports have been submitted yet." })));
    content.hidden = true;
    return;
  }

  const open = data.filter((r) => OPEN_STATUSES.includes(r.status));
  const cards = [
    ["Total reports", data.length],
    ["Open reports", open.length],
    ["Critical and still open", open.filter((r) => r.severity === "critical").length],
    ["Resolved", data.filter((r) => r.status === "resolved").length]
  ];
  stats.replaceChildren(...cards.map(([label, value]) =>
    h("div", { class: "glass stat" }, h("div", { class: "value", text: String(value) }), h("div", { class: "label", text: label }))));

  function bars(containerId, rows) {
    const max = Math.max(1, ...rows.map((r) => r.count));
    document.getElementById(containerId).replaceChildren(...rows.map((r) => {
      const fill = h("div", { class: "bar-fill" });
      fill.style.width = Math.round((r.count / max) * 100) + "%";
      if (r.color) fill.style.background = r.color;
      return h("li", { class: "bar-row" },
        h("span", { text: r.label }),
        h("div", { class: "bar-track", role: "img", "aria-label": r.label + ": " + r.count }, fill),
        h("span", { class: "bar-count", text: String(r.count) }));
    }));
  }
  const count = (key, value) => data.filter((r) => r[key] === value).length;

  bars("bars-status", Object.keys(STATUS_LABELS).map((k) => ({ label: STATUS_LABELS[k], count: count("status", k) })));
  bars("bars-severity", Object.keys(SEVERITY_LABELS).reverse().map((k) => ({ label: SEVERITY_LABELS[k], count: count("severity", k), color: SEVERITY_COLORS[k] })));
  bars("bars-category", Object.keys(CATEGORY_LABELS).map((k) => ({ label: CATEGORY_LABELS[k], count: count("category", k) })));

  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: d.getFullYear() + "-" + d.getMonth(),
      label: d.toLocaleString("en-IN", { month: "short", year: "numeric" }),
      count: 0
    });
  }
  data.forEach((r) => {
    const d = new Date(r.created_at);
    const m = months.find((x) => x.key === d.getFullYear() + "-" + d.getMonth());
    if (m) m.count++;
  });
  bars("bars-month", months);

  document.getElementById("recent").replaceChildren(...data.slice(0, 5).map((r) =>
    h("li", { class: "bar-row recent-row" },
      h("a", { href: "/admin/report.html?id=" + encodeURIComponent(r.id), text: r.title }),
      h("span", { class: "btn-row" }, severityBadge(r.severity), statusBadge(r.status)))));
})();
