"use strict";
(async function () {
  const ctx = await initPage({ require: "user" });
  if (!ctx) return;
  const list = document.getElementById("list");

  const { data: reports, error } = await db
    .from("reports")
    .select("id, title, description, category, severity, status, address, image_path, created_at")
    .eq("user_id", ctx.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    list.replaceChildren(h("p", { class: "msg error", role: "alert", text: "Your reports could not be loaded. Refresh the page and try again." }));
    return;
  }
  if (!reports.length) {
    list.replaceChildren(h("div", { class: "glass empty" },
      h("p", { text: "You have not reported anything yet." }),
      h("a", { class: "btn btn-primary", href: "/report.html" }, "Report a road issue")));
    return;
  }

  const { data: history } = await db
    .from("status_history")
    .select("report_id, new_status, comment, changed_at")
    .in("report_id", reports.map((r) => r.id))
    .order("changed_at", { ascending: true });
  const byReport = {};
  (history || []).forEach((row) => { (byReport[row.report_id] = byReport[row.report_id] || []).push(row); });

  list.replaceChildren(...reports.map((r) => {
    const url = photoUrl(r.image_path);
    const steps = (byReport[r.id] || []).map((s) =>
      h("li", null,
        h("strong", { text: STATUS_LABELS[s.new_status] || s.new_status }),
        " on " + formatDate(s.changed_at),
        s.comment ? h("div", { class: "muted", text: s.comment }) : null));
    return h("article", { class: "glass report-card" },
      h("header", null, h("h3", { text: r.title }), h("div", { class: "btn-row" }, severityBadge(r.severity), statusBadge(r.status))),
      h("p", { class: "meta" },
        h("span", { text: CATEGORY_LABELS[r.category] || r.category }),
        h("span", { text: "Reported " + formatDate(r.created_at) }),
        r.address ? h("span", { text: r.address }) : null),
      h("details", null,
        h("summary", { text: "Details and history" }),
        r.description ? h("p", { class: "pre", text: r.description }) : null,
        url ? h("img", { class: "photo", src: url, alt: "Photo you submitted for: " + r.title, loading: "lazy" }) : null,
        h("ol", { class: "timeline" }, steps)));
  }));
})();
