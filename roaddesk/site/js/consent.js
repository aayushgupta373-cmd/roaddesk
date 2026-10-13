"use strict";
/* Cookie and storage notice. Optional analytics (GoatCounter) load ONLY after the visitor accepts. */
(function () {
  const KEY = "roaddesk_consent";
  const read = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const write = (v) => { try { localStorage.setItem(KEY, v); } catch (e) { /* storage blocked */ } };

  function loadAnalytics() {
    const code = APP_CONFIG.GOATCOUNTER_CODE;
    if (!code || !/^[a-z0-9-]+$/.test(code) || document.getElementById("gc-script")) return;
    const s = document.createElement("script");
    s.id = "gc-script";
    s.async = true;
    s.src = "https://gc.zgo.at/count.js";
    s.setAttribute("data-goatcounter", "https://" + code + ".goatcounter.com/count");
    document.head.appendChild(s);
  }
  function close() {
    const b = document.getElementById("consent-banner");
    if (b) b.remove();
  }
  function choose(value) {
    write(value);
    if (value === "accepted") loadAnalytics();
    close();
  }
  function open() {
    if (document.getElementById("consent-banner")) return;
    const banner = h("div", { id: "consent-banner", class: "consent", role: "region", "aria-label": "Cookie and storage notice" },
      h("p", null,
        "This site stores your login session in your browser so you stay signed in. That is required for the site to work. ",
        "With your permission we also count visits using GoatCounter, which sets no cookies and does not track you across sites. ",
        h("a", { href: "/privacy.html" }, "Read the privacy policy"), "."),
      h("div", { class: "btn-row" },
        h("button", { type: "button", class: "btn btn-primary", onclick: () => choose("accepted") }, "Allow visit counts"),
        h("button", { type: "button", class: "btn btn-secondary", onclick: () => choose("declined") }, "Required storage only")));
    document.body.append(banner);
  }

  const saved = read();
  if (saved === "accepted") loadAnalytics();
  if (!saved) open();
  const settings = document.getElementById("cookie-settings");
  if (settings) settings.addEventListener("click", open);
})();
