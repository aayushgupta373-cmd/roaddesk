"use strict";
(async function () {
  await initPage();
  const form = document.getElementById("reset-form");
  const msg = document.getElementById("form-msg");
  let ready = false;

  function enable() { ready = true; form.hidden = false; hideMsg(msg); }
  db.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") enable(); });
  const { data } = await db.auth.getSession();
  if (data.session) enable();
  setTimeout(() => {
    if (!ready) showMsg(msg, "error", "This reset link is invalid or has expired. Request a new one.");
  }, 2500);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg(msg);
    const password = form.elements.password.value;
    const problem = passwordProblem(password);
    if (problem) { showMsg(msg, "error", problem); return; }
    if (password !== form.elements.confirm.value) { showMsg(msg, "error", "The two passwords do not match."); return; }
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    const { error } = await db.auth.updateUser({ password });
    if (error) {
      showMsg(msg, "error", "Could not change the password. Request a new reset link and try again.");
      btn.disabled = false;
      return;
    }
    form.hidden = true;
    showMsg(msg, "ok", "Password changed. You can now log in with the new password.");
  });
})();
