"use strict";
(async function () {
  const ctx = await initPage({ require: "admin" });
  if (!ctx) return;

  const map = createMap("map", APP_CONFIG.DEFAULT_MAP_CENTER, APP_CONFIG.DEFAULT_MAP_ZOOM);
  const layer = L.layerGroup().addTo(map);
  const filter = document.getElementById("f-status");
  const info = document.getElementById("result-info");

  filter.replaceChildren(
    h("option", { value: "open", text: "Open reports" }),
    h("option", { value: "all", text: "All reports" }),
    ...Object.keys(STATUS_LABELS).map((k) => h("option", { value: k, text: STATUS_LABELS[k] })));
  document.getElementById("legend").replaceChildren(...Object.keys(SEVERITY_LABELS).map((k) => severityBadge(k)));

  const { data, error } = await db
    .from("reports")
    .select("id, title, severity, status, latitude, longitude")
    .limit(1000);
  if (error) { info.textContent = "Reports could not be loaded. Refresh and try again."; return; }

  function render(fit) {
    layer.clearLayers();
    const v = filter.value;
    const list = data.filter((r) => v === "all" || (v === "open" ? OPEN_STATUSES.includes(r.status) : r.status === v));
    list.forEach((r) => {
      const popup = h("div", null,
        h("strong", { text: r.title }), h("br"),
        "Severity: " + (SEVERITY_LABELS[r.severity] || r.severity), h("br"),
        "Status: " + (STATUS_LABELS[r.status] || r.status), h("br"),
        h("a", { href: "/admin/report.html?id=" + encodeURIComponent(r.id), text: "Open report" }));
      severityMarker(Number(r.latitude), Number(r.longitude), r.severity).bindPopup(popup).addTo(layer);
    });
    info.textContent = list.length + (list.length === 1 ? " report shown" : " reports shown");
    if (fit && list.length) {
      map.fitBounds(L.latLngBounds(list.map((r) => [Number(r.latitude), Number(r.longitude)])).pad(0.2));
    }
  }
  filter.addEventListener("change", () => render(true));
  render(true);
})();
