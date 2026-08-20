/**
 * Import-free environment flag helpers.
 *
 * Kept dependency free so these can be imported from anywhere in the app and
 * from Convex Node actions (which only resolve relative imports).
 */

function readEnv(name: string): string | undefined {
  return typeof process !== "undefined" ? process.env?.[name] : undefined;
}

export const isUnlimitedAccessEnabled = (): boolean =>
  readEnv("UNLIMITED_ACCESS") === "true" ||
  readEnv("NEXT_PUBLIC_UNLIMITED_ACCESS") === "true";

export const UNLIMITED_QUOTA = 1_000_000_000;