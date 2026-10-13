/* The ONLY file you edit to connect the site.
   Safe to publish: the project URL and the anon/publishable key.
   NEVER put the service_role key or any key starting with sb_secret_ here. */
const APP_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT-REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-ANON-OR-PUBLISHABLE-KEY",

  // Optional. Leave empty to turn the feature off.
  TURNSTILE_SITE_KEY: "",   // Cloudflare Turnstile site key (spam protection)
  GOATCOUNTER_CODE: "",     // GoatCounter site code, for example "roaddesk"

  // Map starts here. Change to your own city (latitude, longitude).
  DEFAULT_MAP_CENTER: [21.2514, 81.6296],
  DEFAULT_MAP_ZOOM: 12
};
