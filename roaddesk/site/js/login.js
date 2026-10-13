"use strict";
(async function () {
  const ctx = await initPage();
  if (ctx && ctx.user) {
    location.replace(ctx.profile && ctx.profile.role === "admin" ? "/admin/index.html" : "/my-reports.html");
    return;
  }
  const form = document.getElementById("login-form");
  const msg = document.getElementById("form-msg");
  const captcha = setupCaptcha("captcha");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg(msg);
    if (form.elements.website.value) return; // honeypot: real people never fill this
    const email = clean(form.elements.email.value, 254).toLowerCase();
    const password = form.elements.password.value;
    if (!email || !password) { showMsg(msg, "error", "Enter your email and password."); return; }

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    const { data, error } = await db.auth.signInWithPassword({
      email, password, options: { captchaToken: captcha.getToken() }
    });
    if (error) {
      let text = "Email or password is incorrect.";
      if (error.code === "email_not_confirmed") text = "Confirm your email first. Check your inbox for the confirmation link.";
      else if (/captcha/i.test(error.message || "")) text = "Complete the spam check and try again.";
      else if (error.status === 429) text = "Too many attempts. Wait a few minutes and try again.";
      showMsg(msg, "error", text);
      captcha.reset();
      btn.disabled = false;
      return;
    }
    const profile = await loadProfile(data.user.id);
    location.replace(profile && profile.role === "admin" ? "/admin/index.html" : "/my-reports.html");
  });
})();
