/**
 * Global access policy.
 *
 * When unlimited mode is enabled every user (free or paid) skips rate-limit /
 * quota gates. Controlled by `UNLIMITED_ACCESS` (server) or
 * `NEXT_PUBLIC_UNLIMITED_ACCESS` (client+server). Defaults to off so existing
 * tests keep exercising the normal limiting paths.
 */

import type { RateLimitInfo } from "@/types";
import { isUnlimitedAccessEnabled, UNLIMITED_QUOTA } from "@/lib/env-flags";

export { isUnlimitedAccessEnabled, UNLIMITED_QUOTA } from "@/lib/env-flags";

export const getUnlimitedRateLimitInfo = (): RateLimitInfo => ({
  remaining: UNLIMITED_QUOTA,
  resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
  limit: UNLIMITED_QUOTA,
  rateLimitSkipped: true,
});