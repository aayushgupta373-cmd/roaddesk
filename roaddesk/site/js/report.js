"use strict";
(async function () {
  const ctx = await initPage({ require: "user" });
  if (!ctx) return;

  const form = document.getElementById("report-form");
  const msg = document.getElementById("form-msg");
  const coordText = document.getElementById("coord-text");
  const latInput = form.elements.latitude;
  const lngInput = form.elements.longitude;
  const photoInput = form.elements.photo;
  const preview = document.getElementById("photo-preview");

  /* ----- Map: click to place the pin ----- */
  const map = createMap("map", APP_CONFIG.DEFAULT_MAP_CENTER, APP_CONFIG.DEFAULT_MAP_ZOOM);
  let marker = null;
  function setPoint(lat, lng) {
    latInput.value = lat.toFixed(6);
    lngInput.value = lng.toFixed(6);
    const sev = (form.querySelector('input[name="severity"]:checked') || {}).value || "medium";
    if (marker) marker.setLatLng([lat, lng]);
    else marker = severityMarker(lat, lng, sev).addTo(map);
    coordText.textContent = "Pin placed at " + lat.toFixed(5) + ", " + lng.toFixed(5);
  }
  map.on("click", (e) => setPoint(e.latlng.lat, e.latlng.lng));
  form.querySelectorAll('input[name="severity"]').forEach((r) =>
    r.addEventListener("change", () => { if (marker) marker.setStyle({ fillColor: SEVERITY_COLORS[r.value] }); })
  );

  document.getElementById("gps-btn").addEventListener("click", () => {
    if (!navigator.geolocation) { showMsg(msg, "error", "Your browser cannot share location. Click the map instead."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { hideMsg(msg); setPoint(pos.coords.latitude, pos.coords.longitude); map.setView([pos.coords.latitude, pos.coords.longitude], 17); },
      () => showMsg(msg, "error", "Location was blocked or unavailable. Click the map to place the pin instead."),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });

  /* ----- Photo preview ----- */
  photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];
    if (preview.dataset.url) URL.revokeObjectURL(preview.dataset.url);
    if (!file) { preview.hidden = true; return; }
    const url = URL.createObjectURL(file);
    preview.dataset.url = url;
    preview.src = url;
    preview.hidden = false;
  });

  /* ----- Shrink the photo in the browser (also removes hidden EXIF location data) ----- */
  async function compressImage(file) {
    let bitmap;
    try { bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch (e) { bitmap = await createImageBitmap(file); }
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const hgt = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = hgt;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, w, hgt);
    if (bitmap.close) bitmap.close();
    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("image"))), "image/jpeg", 0.8)
    );
  }

  /* ----- Submit ----- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg(msg);
    if (form.elements.website.value) return; // honeypot

    const title = clean(form.elements.title.value, 120);
    const description = clean(form.elements.description.value, 2000);
    const address = clean(form.elements.address.value, 300);
    const category = form.elements.category.value;
    const checked = form.querySelector('input[name="severity"]:checked');
    const severity = checked ? checked.value : "";
    const lat = parseFloat(latInput.value);
    const lng = parseFloat(lngInput.value);
    const file = photoInput.files[0];

    const errors = [];
    if (title.length < 5) errors.push("Enter a title of at least 5 characters.");
    if (!Object.keys(CATEGORY_LABELS).includes(category)) errors.push("Choose a category.");
    if (!Object.keys(SEVERITY_LABELS).includes(severity)) errors.push("Choose a severity level.");
    if (!isFinite(lat) || !isFinite(lng)) errors.push("Place the pin on the map or use your current location.");
    if (file) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) errors.push("The photo must be a JPEG, PNG or WebP image.");
      if (file.size > 10 * 1024 * 1024) errors.push("The photo must be smaller than 10 MB.");
    }
    if (errors.length) { showMsg(msg, "error", errors); return; }

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Submitting";

    try {
      let imagePath = null;
      if (file) {
        const blob = await compressImage(file);
        imagePath = ctx.user.id + "/" + crypto.randomUUID() + ".jpg";
        const up = await db.storage.from("report-images").upload(imagePath, blob, { contentType: "image/jpeg", upsert: false });
        if (up.error) throw new Error("photo");
      }
      const { error } = await db.from("reports").insert({
        user_id: ctx.user.id, title, description: description || null, category, severity,
        latitude: lat, longitude: lng, address: address || null, image_path: imagePath
      });
      if (error) throw error;

      form.reset();
      preview.hidden = true;
      if (marker) { marker.remove(); marker = null; }
      coordText.textContent = "No pin placed yet.";
      showMsg(msg, "ok", "Report submitted. You can follow its status under My reports.");
      msg.focus();
    } catch (err) {
      let text = "The report could not be submitted. Check your connection and try again.";
      if (err && err.message === "photo") text = "The photo could not be uploaded. Try a smaller image or submit without it.";
      else if (err && err.message === "image") text = "That file could not be read as an image. Choose a different photo.";
      else if (err && typeof err.message === "string" && err.message.includes("too many reports")) text = err.message;
      showMsg(msg, "error", text);
    }
    btn.disabled = false;
    btn.textContent = "Submit report";
  });
})();
