#!/usr/bin/env node
/**
 * Non-interactive local env bootstrap.
 * Fills auto-generated secrets and dev defaults; leaves API keys empty unless
 * already present in an existing .env.local.
 */
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const envPath = path.join(projectRoot, ".env.local");
const centrifugoEnvPath = path.join(
  projectRoot,
  "docker",
  "centrifugo",
  ".env",
);

const secret = () => crypto.randomBytes(32).toString("base64");
const hexSecret = () => crypto.randomBytes(32).toString("hex");

function parseEnv(content) {
  const values = new Map();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values.set(key, value);
  }
  return values;
}

function isUnset(value) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "replace-with-a-32+char-random-secret" ||
    value.startsWith("sk_example_") ||
    value.startsWith("client_123") ||
    value === "dev:your-deployment-name" ||
    value === "https://your-deployment.convex.cloud" ||
    value === "proj_" ||
    value === "tr_dev_"
  );
}

async function readExistingEnv() {
  try {
    return parseEnv(await fs.readFile(envPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return new Map();
    throw error;
  }
}

function buildEnv(values) {
  const pick = (key, fallback) => {
    const current = values.get(key);
    return isUnset(current) ? fallback : current;
  };

  const workosCookiePassword = pick("WORKOS_COOKIE_PASSWORD", secret());
  const accountIdentityHmacSecret = pick(
    "ACCOUNT_IDENTITY_HMAC_SECRET",
    secret(),
  );
  const convexServiceRoleKey = pick("CONVEX_SERVICE_ROLE_KEY", secret());
  const centrifugoTokenSecret = pick("CENTRIFUGO_TOKEN_SECRET", secret());
  const centrifugoApiKey = pick("CENTRIFUGO_API_KEY", hexSecret());

  return {
    content: `# =============================================================================
# AUTHENTICATION - WorkOS (Required) — fill WORKOS_* API keys below
# =============================================================================
WORKOS_API_KEY=${pick("WORKOS_API_KEY", "")}
WORKOS_CLIENT_ID=${pick("WORKOS_CLIENT_ID", "")}
WORKOS_AUTH_DOMAIN=${pick("WORKOS_AUTH_DOMAIN", "api.workos.com")}
WORKOS_COOKIE_PASSWORD=${workosCookiePassword}
NEXT_PUBLIC_WORKOS_REDIRECT_URI=${pick("NEXT_PUBLIC_WORKOS_REDIRECT_URI", "http://localhost:3000/callback")}
ACCOUNT_IDENTITY_HMAC_SECRET=${accountIdentityHmacSecret}
WORKOS_WEBHOOK_SECRET=${pick("WORKOS_WEBHOOK_SECRET", "")}

# =============================================================================
# CONVEX DATABASE (Required)
# Local: run \`pnpm run dev:local\` — Convex CLI fills deployment values on first start
# =============================================================================
CONVEX_DEPLOYMENT=${pick("CONVEX_DEPLOYMENT", "")}
NEXT_PUBLIC_CONVEX_URL=${pick("NEXT_PUBLIC_CONVEX_URL", "http://127.0.0.1:3210")}
CONVEX_SERVICE_ROLE_KEY=${convexServiceRoleKey}

# =============================================================================
# AI PROVIDERS (Required) — fill your API keys
# =============================================================================
OPENROUTER_API_KEY=${pick("OPENROUTER_API_KEY", "")}
OPENAI_API_KEY=${pick("OPENAI_API_KEY", "")}
XAI_API_KEY=${pick("XAI_API_KEY", "")}

# =============================================================================
# CODE EXECUTION - E2B (cloud agent sandbox)
# =============================================================================
E2B_API_KEY=${pick("E2B_API_KEY", "")}
E2B_TEMPLATE=${pick("E2B_TEMPLATE", "terminal-agent-sandbox")}

# =============================================================================
# BASE URL (Required)
# =============================================================================
NEXT_PUBLIC_BASE_URL=${pick("NEXT_PUBLIC_BASE_URL", "http://localhost:3000")}

# =============================================================================
# CENTRIFUGO (local sandbox relay — start with docker compose in docker/centrifugo)
# =============================================================================
CENTRIFUGO_TOKEN_SECRET=${centrifugoTokenSecret}
CENTRIFUGO_API_KEY=${centrifugoApiKey}
CENTRIFUGO_WS_URL=${pick("CENTRIFUGO_WS_URL", "ws://localhost:8000/connection/websocket")}

# =============================================================================
# TRIGGER.DEV (Agent Long mode — optional for first run)
# =============================================================================
TRIGGER_PROJECT_ID=${pick("TRIGGER_PROJECT_ID", "")}
TRIGGER_SECRET_KEY=${pick("TRIGGER_SECRET_KEY", "")}
`,
    centrifugoTokenSecret,
    centrifugoApiKey,
  };
}

async function main() {
  const existing = await readExistingEnv();
  const { content, centrifugoTokenSecret, centrifugoApiKey } =
    buildEnv(existing);

  await fs.writeFile(envPath, content, "utf8");
  console.log(`Wrote ${path.relative(projectRoot, envPath)}`);

  const centrifugoEnv = `CENTRIFUGO_TOKEN_SECRET=${centrifugoTokenSecret}
CENTRIFUGO_API_KEY=${centrifugoApiKey}
`;
  await fs.mkdir(path.dirname(centrifugoEnvPath), { recursive: true });
  await fs.writeFile(centrifugoEnvPath, centrifugoEnv, "utf8");
  console.log(`Wrote ${path.relative(projectRoot, centrifugoEnvPath)}`);

  const missing = [
  ["WORKOS_API_KEY", existing.get("WORKOS_API_KEY")],
  ["WORKOS_CLIENT_ID", existing.get("WORKOS_CLIENT_ID")],
  ["OPENROUTER_API_KEY", existing.get("OPENROUTER_API_KEY")],
  ["OPENAI_API_KEY", existing.get("OPENAI_API_KEY")],
  ].filter(([, value]) => isUnset(value));

  if (missing.length > 0) {
    console.log("\nStill required before the app works:");
    for (const [key] of missing) {
      console.log(`  - ${key}`);
    }
    console.log("\nNext: corepack pnpm install && corepack pnpm run dev:local");
  } else {
    console.log("\nAPI keys present. Next: corepack pnpm install && corepack pnpm run dev:local");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
