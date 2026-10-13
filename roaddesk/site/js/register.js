"use strict";
(async function () {
  const ctx = await initPage();
  if (ctx && ctx.user) { location.replace("/report.html"); return; }
  const form = document.getElementById("register-form");
  const msg = document.getElementById("form-msg");
  const captcha = setupCaptcha("captcha");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg(msg);
    if (form.elements.website.value) return; // honeypot
    const fullName = clean(form.elements.full_name.value, 100);
    const email = clean(form.elements.email.value, 254).toLowerCase();
    const phone = clean(form.elements.phone.value, 20);
    const password = form.elements.password.value;
    const confirm = form.elements.confirm.value;

    const errors = [];
    if (fullName.length < 2) errors.push("Enter your full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Enter a valid email address.");
    if (phone && !/^[0-9+()\s-]{7,20}$/.test(phone)) errors.push("Phone number can contain digits, spaces, +, - and brackets only.");
    const pwProblem = passwordProblem(password);
    if (pwProblem) errors.push(pwProblem);
    else if (password !== confirm) errors.push("The two passwords do not match.");
    if (!form.elements.agree.checked) errors.push("Accept the terms and the privacy policy to continue.");
    if (errors.length) { showMsg(msg, "error", errors); return; }

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    const { data, error } = await db.auth.signUp({
      email, password,
      options: {
        data: { full_name: fullName, phone },
        captchaToken: captcha.getToken(),
        emailRedirectTo: location.origin + "/login.html"
      }
    });
    if (error) {
      let text = "Could not create the account. Check your details and try again.";
      if (/captcha/i.test(error.message || "")) text = "Complete the spam check and try again.";
      else if (error.status === 429) text = "Too many attempts. Wait a few minutes and try again.";
      showMsg(msg, "error", text);
      captcha.reset();
      btn.disabled = false;
      return;
    }
    if (data.session) { location.replace("/report.html"); return; }
    form.reset();
    showMsg(msg, "ok", "Account created. Open the confirmation email we sent you, then log in.");
    btn.disabled = false;
  });
})();
