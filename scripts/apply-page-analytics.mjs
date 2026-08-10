import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const sql = readFileSync(
  resolve(root, "supabase/migrations/202608100001_create_page_analytics.sql"),
  "utf8",
);

const url = process.env.SUPABASE_URL?.trim();
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const projectRef =
  process.env.SUPABASE_PROJECT_REF?.trim() ||
  (url ? new URL(url).hostname.split(".")[0] : "");

if (!url || !serviceRole || !accessToken || !projectRef) {
  console.error("Missing Supabase credentials for migration");
  process.exit(1);
}

const probe = async () => {
  const supabase = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await supabase.rpc("zz_get_page_engagement", {
    target_page_key: "__migration_probe__",
    target_visitor_hash: "probe",
  });
  return !error;
};

if (await probe()) {
  console.log("RPCs already present; refreshing function definitions");
}

const response = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  },
);

const payload = await response.text();
if (!response.ok) {
  console.error("Migration failed:", response.status, payload);
  process.exit(1);
}

console.log("Migration applied:", payload.slice(0, 300));

// Give schema cache a moment, then probe.
for (let attempt = 0; attempt < 10; attempt += 1) {
  if (await probe()) {
    console.log("RPC probe ok");
    process.exit(0);
  }
  await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
}

console.error("Migration applied but RPC probe failed");
process.exit(1);
