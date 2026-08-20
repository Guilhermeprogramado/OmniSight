/**
 * Developer / owner email allowlist.
 *
 * Emails in this list bypass the paywall entirely and resolve to the maximum
 * (ultra) tier on every surface: server routes, the entitlements API, and
 * Convex actions. The default entry is the local repo owner; extend it via the
 * `DEV_EMAILS` / `NEXT_PUBLIC_DEV_EMAILS` environment variables (comma
 * separated, case-insensitive).
 */

const DEFAULT_DEV_EMAILS: readonly string[] = [
  "willis.dosanjosrosario@gmail.com",
];

function readEnv(name: string): string | undefined {
  return typeof process !== "undefined" ? process.env?.[name] : undefined;
}

function normalizeEmails(list: readonly string[]): string[] {
  return [
    ...new Set(
      list
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email.length > 0),
    ),
  ];
}

export function getDevEmails(): string[] {
  const envList = (readEnv("DEV_EMAILS") ?? readEnv("NEXT_PUBLIC_DEV_EMAILS") ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  return normalizeEmails([...DEFAULT_DEV_EMAILS, ...envList]);
}

export function isDevEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getDevEmails().includes(email.trim().toLowerCase());
}

/** Resolve to "ultra" when the email is allowlisted, otherwise "free". */
export function resolveDevSubscriptionTier(
  email: string | null | undefined,
): "ultra" | "free" {
  return isDevEmail(email) ? "ultra" : "free";
}