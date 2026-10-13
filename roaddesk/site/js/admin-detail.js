"use strict";
(async function () {
  const ctx = await initPage({ require: "admin" });
  if (!ctx) return;

  const box = document.getElementById("detail");
  const idParam = new URLSearchParams(location.search).get("id");
  if (!/^[0-9]{1,15}$/.test(idParam || "")) {
    box.replaceChildren(h("p", { class: "msg error", text: "This report link is not valid." }));
    return;
  }
  const id = Number(idParam);

  const [repRes, staffRes] = await Promise.all([
    db.from("reports").select("*").eq("id", id).maybeSingle(),
    db.from("profiles").select("id, full_name, role").in("role", ["admin", "worker"])
  ]);
  if (repRes.error || !repRes.data) {
    box.replaceChildren(h("p", { class: "msg error", text: "This report could not be found." }));
    return;
  }
  const r = repRes.data;
  const staff = staffRes.data || [];
  const { data: reporter } = await db.from("profiles").select("full_name, phone").eq("id", r.user_id).maybeSingle();

  const lat = Number(r.latitude), lng = Number(r.longitude);
  const url = photoUrl(r.image_path);
  document.title = "Report " + id + " | RoadDesk admin";

  /* ----- Left column: facts ----- */
  const facts = h("dl", { class: "dl" },
    h("dt", { text: "Title" }), h("dd", { text: r.title }),
    h("dt", { text: "Category" }), h("dd", { text: CATEGORY_LABELS[r.category] || r.category }),
    h("dt", { text: "Severity" }), h("dd", null, severityBadge(r.severity)),
    h("dt", { text: "Status" }), h("dd", null, statusBadge(r.status)),
    h("dt", { text: "Description" }), h("dd", { class: "pre", text: r.description || "None given" }),
    h("dt", { text: "Address" }), h("dd", { text: r.address || "None given" }),
    h("dt", { text: "Coordinates" }), h("dd", null,
      lat.toFixed(5) + ", " + lng.toFixed(5) + " ",
      h("a", { href: "https://www.openstreetmap.org/?mlat=" + lat + "&mlon=" + lng + "#map=18/" + lat + "/" + lng, target: "_blank", rel: "noopener noreferrer", text: "Open in OpenStreetMap" })),
    h("dt", { text: "Reported by" }), h("dd", { text: reporter ? (reporter.full_name || "Name not given") + (reporter.phone ? ", " + reporter.phone : "") : "Unknown" }),
    h("dt", { text: "Reported on" }), h("dd", { text: formatDate(r.created_at) }),
    h("dt", { text: "Last updated" }), h("dd", { text: formatDate(r.updated_at) }));

  const historyList = h("ol", { class: "timeline" });
  const photo = url ? h("img", { class: "photo", src: url, alt: "Photo submitted with report: " + r.title, loading: "lazy" }) : null;

  /* ----- Update form ----- */
  const statusSel = h("select", { id: "u-status" }, Object.keys(STATUS_LABELS).map((k) => h("option", { value: k, text: STATUS_LABELS[k] })));
  const sevSel = h("select", { id: "u-severity" }, Object.keys(SEVERITY_LABELS).map((k) => h("option", { value: k, text: SEVERITY_LABELS[k] })));
  const assignSel = h("select", { id: "u-assign" }, h("option", { value: "", text: "Not assigned" }),
    staff.map((s) => h("option", { value: s.id, text: (s.full_name || "Unnamed staff") + " (" + s.role + ")" })));
  const note = h("textarea", { id: "u-note", maxlength: "1000" });
  const msg = h("p", { class: "msg", hidden: true, role: "alert", tabindex: "-1" });
  const saveBtn = h("button", { type: "submit", class: "btn btn-primary" }, "Save changes");
  statusSel.value = r.status; sevSel.value = r.severity; assignSel.value = r.assigned_to || ""; note.value = r.admin_note || "";

  const form = h("form", { class: "form", novalidate: true },
    h("div", { class: "field" }, h("label", { for: "u-status", text: "Status" }), statusSel),
    h("div", { class: "field" }, h("label", { for: "u-severity", text: "Severity" }), sevSel),
    h("div", { class: "field" }, h("label", { for: "u-assign", text: "Assigned to" }), assignSel),
    h("div", { class: "field" }, h("label", { for: "u-note", text: "Note for the reporter" }),
      h("p", { class: "hint", text: "Shown to the person who reported this issue when the status changes. Do not write private details here." }), note),
    msg, h("div", { class: "btn-row" }, saveBtn));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg(msg);
    const assignee = assignSel.value || null;
    if (statusSel.value === "assigned" && !assignee) { showMsg(msg, "error", "Choose who this report is assigned to, or pick a different status."); return; }
    saveBtn.disabled = true;
    const { error } = await db.from("reports").update({
      status: statusSel.value, severity: sevSel.value, assigned_to: assignee, admin_note: clean(note.value, 1000) || null
    }).eq("id", id);
    saveBtn.disabled = false;
    if (error) { showMsg(msg, "error", "Changes could not be saved. Refresh the page and try again."); return; }
    showMsg(msg, "ok", "Changes saved.");
    loadHistory();
  });

  async function loadHistory() {
    const { data } = await db.from("status_history").select("new_status, comment, changed_at").eq("report_id", id).order("changed_at", { ascending: true });
    historyList.replaceChildren(...(data || []).map((s) =>
      h("li", null, h("strong", { text: STATUS_LABELS[s.new_status] || s.new_status }), " on " + formatDate(s.changed_at),
        s.comment ? h("div", { class: "muted", text: s.comment }) : null)));
  }

  box.replaceChildren(
    h("div", { class: "detail-grid" },
      h("div", null,
        h("section", { class: "glass panel" }, h("h2", { text: "Report details" }), facts, photo),
        h("section", { class: "glass panel" }, h("h2", { text: "Status history" }), historyList)),
      h("div", null,
        h("section", { class: "glass panel" }, h("h2", { text: "Update this report" }), form),
        h("section", { class: "glass panel" }, h("h2", { text: "Location" }), h("div", { id: "map", class: "map" })))));

  const map = createMap("map", [lat, lng], 16);
  severityMarker(lat, lng, r.severity).addTo(map);
  loadHistory();
})();
