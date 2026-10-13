"use strict";
(async function () {
  const ctx = await initPage({ require: "admin" });
  if (!ctx) return;

  const rows = document.getElementById("rows");
  const info = document.getElementById("result-info");
  const moreBtn = document.getElementById("more-btn");
  const f = {
    status: document.getElementById("f-status"),
    severity: document.getElementById("f-severity"),
    category: document.getElementById("f-category"),
    sort: document.getElementById("f-sort"),
    q: document.getElementById("f-q")
  };
  function fill(select, labels, allText) {
    select.replaceChildren(h("option", { value: "", text: allText }),
      ...Object.keys(labels).map((k) => h("option", { value: k, text: labels[k] })));
  }
  fill(f.status, STATUS_LABELS, "All statuses");
  fill(f.severity, SEVERITY_LABELS, "All severities");
  fill(f.category, CATEGORY_LABELS, "All categories");

  const { data, error } = await db
    .from("reports")
    .select("id, title, category, severity, status, address, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) {
    info.textContent = "Reports could not be loaded. Refresh and try again.";
    return;
  }

  let shown = 50;
  function render() {
    const q = clean(f.q.value, 100).toLowerCase();
    let list = data.filter((r) =>
      (!f.status.value || r.status === f.status.value) &&
      (!f.severity.value || r.severity === f.severity.value) &&
      (!f.category.value || r.category === f.category.value) &&
      (!q || r.title.toLowerCase().includes(q) || (r.address || "").toLowerCase().includes(q)));
    if (f.sort.value === "severity") {
      list = list.slice().sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || new Date(b.created_at) - new Date(a.created_at));
    }
    info.textContent = list.length + (list.length === 1 ? " report" : " reports");
    if (!list.length) {
      rows.replaceChildren(h("tr", null, h("td", { colspan: "6", class: "empty", text: "No reports match these filters." })));
      moreBtn.hidden = true;
      return;
    }
    rows.replaceChildren(...list.slice(0, shown).map((r) =>
      h("tr", null,
        h("td", null, h("a", { href: "/admin/report.html?id=" + encodeURIComponent(r.id), text: r.title })),
        h("td", { text: CATEGORY_LABELS[r.category] || r.category }),
        h("td", null, severityBadge(r.severity)),
        h("td", null, statusBadge(r.status)),
        h("td", { text: r.address || "" }),
        h("td", { text: formatDate(r.created_at) }))));
    moreBtn.hidden = list.length <= shown;
  }
  Object.values(f).forEach((el) => el.addEventListener(el === f.q ? "input" : "change", () => { shown = 50; render(); }));
  moreBtn.addEventListener("click", () => { shown += 50; render(); });
  render();
})();
