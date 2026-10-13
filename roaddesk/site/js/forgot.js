"use strict";
(async function () {
  await initPage();
  const form = document.getElementById("forgot-form");
  const msg = document.getElementById("form-msg");
  const captcha = setupCaptcha("captcha");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg(msg);
    if (form.elements.website.value) return;
    const email = clean(form.elements.email.value, 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showMsg(msg, "error", "Enter a valid email address."); return; }
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    await db.auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + "/reset.html",
      captchaToken: captcha.getToken()
    });
    // Same answer whether or not the account exists, so nobody can probe for emails.
    showMsg(msg, "ok", "If an account exists for that address, a reset link is on its way.");
    captcha.reset();
    btn.disabled = false;
  });
})();
