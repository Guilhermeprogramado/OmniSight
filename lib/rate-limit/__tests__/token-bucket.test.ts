import { describe, it, expect } from "@jest/globals";

import {
  billableCostDollarsToPoints,
  calculateRawModelUsageCostDollars,
  calculateTokenCost,
  calculateRawTokenCost,
  calculateTierChangeCredits,
  getBudgetLimits,
  getCycleExpireSeconds,
  getSubscriptionPrice,
  isUserRateLimitKey,
  POINTS_PER_DOLLAR,
} from "../token-bucket";

/**
 * Unit tests for token-bucket rate limiting pure functions.
 *
 * Note: The async functions (checkTokenBucketLimit, deductUsage, refundUsage)
 * are difficult to unit test in isolation due to the singleton Redis client pattern
 * and Jest module caching. These functions are better suited for integration tests
 * that can properly initialize and control the Redis/Ratelimit dependencies.
 */
describe("token-bucket", () => {
  // ==========================================================================
  // calculateTokenCost - Core pricing logic
  // ==========================================================================
  describe("calculateTokenCost", () => {
    it("should return 0 for zero or negative tokens", () => {
      expect(calculateTokenCost(0, "input")).toBe(0);
      expect(calculateTokenCost(0, "output")).toBe(0);
      expect(calculateTokenCost(-100, "input")).toBe(0);
      expect(calculateTokenCost(-100, "output")).toBe(0);
    });

    it("should cost zero points for any token volume (all-free inference)", () => {
      // All routes run on free OpenRouter slugs, so token usage never costs
      // points regardless of volume or input/output split.
      expect(calculateTokenCost(1_000_000, "input")).toBe(0);
      expect(calculateTokenCost(1_000, "input")).toBe(0);
      expect(calculateTokenCost(10_000_000, "input")).toBe(0);
      expect(calculateTokenCost(1_000_000, "output")).toBe(0);
      expect(calculateTokenCost(1_000, "output")).toBe(0);
      expect(calculateTokenCost(10_000_000, "output")).toBe(0);
      expect(calculateTokenCost(1, "input")).toBe(0);
      expect(calculateTokenCost(1, "output")).toBe(0);
      expect(calculateTokenCost(100, "input")).toBe(0);
      expect(calculateTokenCost(10, "input")).toBe(0);
    });
  });

  // ==========================================================================
  // calculateRawTokenCost - Analytics/reporting cost without usage multiplier
  // ==========================================================================
  describe("calculateRawTokenCost", () => {
    it("should return 0 for zero or negative tokens", () => {
      expect(calculateRawTokenCost(0, "input")).toBe(0);
      expect(calculateRawTokenCost(0, "output")).toBe(0);
      expect(calculateRawTokenCost(-100, "input")).toBe(0);
      expect(calculateRawTokenCost(-100, "output")).toBe(0);
    });

    it("calculates raw input token cost at zero for all-free inference", () => {
      expect(calculateRawTokenCost(1_000_000, "input")).toBe(0);
      expect(calculateRawTokenCost(1000, "input")).toBe(0);
    });

    it("calculates raw output token cost at zero for all-free inference", () => {
      expect(calculateRawTokenCost(1_000_000, "output")).toBe(0);
      expect(calculateRawTokenCost(1000, "output")).toBe(0);
    });
  });

  describe("calculateRawModelUsageCostDollars", () => {
    it("returns zero for free-tier routes regardless of cache mix", () => {
      expect(
        calculateRawModelUsageCostDollars({
          inputTokens: 1_000_000,
          outputTokens: 100_000,
          cacheReadTokens: 800_000,
          modelName: "x-ai/grok-4.5",
        }),
      ).toBe(0);
    });

    it("returns zero for previously-priced provider models", () => {
      for (const modelName of [
        "moonshotai/kimi-k3-20260715",
        "deepseek/deepseek-v4-flash-20260731",
        "deepseek/deepseek-v4-flash-20260423",
        "model-deepseek-v4-pro",
        "anthropic/claude-4.6-opus-20260205",
        "z-ai/glm-5.2",
        "glm-5.2-20260616",
        "nvidia/nemotron-3-super-120b-a12b:free",
        "model-glm-5.2-free",
      ]) {
        expect(
          calculateRawModelUsageCostDollars({
            inputTokens: 1_000_000,
            outputTokens: 100_000,
            cacheReadTokens: 800_000,
            cacheWriteTokens: 100_000,
            modelName,
          }),
        ).toBe(0);
      }
    });

    it("clamps invalid and overlapping cache token counts", () => {
      expect(
        calculateRawModelUsageCostDollars({
          inputTokens: 100,
          outputTokens: Number.NaN,
          cacheReadTokens: 80,
          cacheWriteTokens: 80,
          modelName: "model-deepseek-v4-pro",
        }),
      ).toBe(0);
      expect(
        calculateRawModelUsageCostDollars({
          inputTokens: Number.POSITIVE_INFINITY,
          outputTokens: Number.NEGATIVE_INFINITY,
          cacheReadTokens: Number.NaN,
        }),
      ).toBe(0);
    });
  });

  // ==========================================================================
  // getBudgetLimits - Subscription tier limits (monthly credit pool)
  // ==========================================================================
  describe("getBudgetLimits", () => {
    it("should return 0 limit for free tier", () => {
      const limits = getBudgetLimits("free");
      expect(limits.monthly).toBe(0);
    });

    it("should return fixed monthly credits for pro tier ($25)", () => {
      const limits = getBudgetLimits("pro");
      expect(limits.monthly).toBe(250_000);
    });

    it("should return fixed monthly credits for pro-plus tier ($60)", () => {
      const limits = getBudgetLimits("pro-plus");
      expect(limits.monthly).toBe(600_000);
    });

    it("should return fixed monthly credits for ultra tier ($200)", () => {
      const limits = getBudgetLimits("ultra");
      expect(limits.monthly).toBe(2_000_000);
    });

    it("should return fixed monthly credits for team tier ($40)", () => {
      const limits = getBudgetLimits("team");
      expect(limits.monthly).toBe(400_000);
    });

    it("ultra should have 8x more monthly credits than pro", () => {
      const proLimits = getBudgetLimits("pro");
      const ultraLimits = getBudgetLimits("ultra");

      expect(ultraLimits.monthly / proLimits.monthly).toBe(8);
    });

    it("pro-plus should have 2.4x more monthly credits than pro", () => {
      const proLimits = getBudgetLimits("pro");
      const proPlusLimits = getBudgetLimits("pro-plus");

      expect(proPlusLimits.monthly / proLimits.monthly).toBe(2.4);
    });

    it("team should have 1.6x more monthly credits than pro", () => {
      const proLimits = getBudgetLimits("pro");
      const teamLimits = getBudgetLimits("team");

      expect(teamLimits.monthly / proLimits.monthly).toBe(1.6);
    });

    it("should return 0 for unknown subscription tier", () => {
      const limits = getBudgetLimits("nonexistent" as any);
      expect(limits.monthly).toBe(0);
    });
  });

  // ==========================================================================
  // getSubscriptionPrice - Dollar amount from credits
  // ==========================================================================
  describe("getSubscriptionPrice", () => {
    it("should return 0 for free tier", () => {
      expect(getSubscriptionPrice("free")).toBe(0);
    });

    it("should return subscription price in dollars for each tier", () => {
      expect(getSubscriptionPrice("pro")).toBe(25);
      expect(getSubscriptionPrice("pro-plus")).toBe(60);
      expect(getSubscriptionPrice("ultra")).toBe(200);
      expect(getSubscriptionPrice("team")).toBe(40);
    });

    it("should return 0 for unknown tier", () => {
      expect(getSubscriptionPrice("nonexistent" as any)).toBe(0);
    });

    it("should be consistent with getBudgetLimits", () => {
      for (const tier of [
        "free",
        "pro",
        "pro-plus",
        "ultra",
        "team",
      ] as const) {
        const dollars = getSubscriptionPrice(tier);
        const points = getBudgetLimits(tier).monthly;
        expect(dollars).toBe(points / POINTS_PER_DOLLAR);
      }
    });
  });

  // ==========================================================================
  // POINTS_PER_DOLLAR constant
  // ==========================================================================
  describe("POINTS_PER_DOLLAR", () => {
    it("should be 10000 (1 point = $0.0001)", () => {
      expect(POINTS_PER_DOLLAR).toBe(10_000);
    });
  });

  describe("billableCostDollarsToPoints", () => {
    it("applies the normal usage multiplier to raw provider and tool cost", () => {
      expect(billableCostDollarsToPoints(1)).toBe(15_000);
      expect(billableCostDollarsToPoints(0.005)).toBe(75);
      expect(billableCostDollarsToPoints(0.000000000001)).toBe(1);
    });

    it("returns 0 for non-positive or invalid cost", () => {
      expect(billableCostDollarsToPoints(0)).toBe(0);
      expect(billableCostDollarsToPoints(-1)).toBe(0);
      expect(billableCostDollarsToPoints(Number.NaN)).toBe(0);
    });
  });

  describe("getCycleExpireSeconds", () => {
    it("uses the default 30-day TTL without a future billing period end", () => {
      expect(getCycleExpireSeconds(undefined, 1_000)).toBe(30 * 24 * 60 * 60);
      expect(getCycleExpireSeconds(999, 1_000)).toBe(30 * 24 * 60 * 60);
    });

    it("keeps buckets alive through longer billing periods", () => {
      const now = 1_000;
      const periodEnd = now + 31 * 24 * 60 * 60;

      expect(getCycleExpireSeconds(periodEnd, now)).toBe(32 * 24 * 60 * 60);
    });
  });

  describe("isUserRateLimitKey", () => {
    const userId = "user_123";

    it("matches all rate-limit namespaces owned by the user", () => {
      expect(isUserRateLimitKey(`usage:monthly:${userId}:pro`, userId)).toBe(
        true,
      );
      expect(isUserRateLimitKey(`upgrade:carryover:${userId}`, userId)).toBe(
        true,
      );
      expect(
        isUserRateLimitKey(
          `upgrade:carryover:${userId}:in_upgrade:claim`,
          userId,
        ),
      ).toBe(true);
      expect(isUserRateLimitKey(`free_limit:${userId}:free:ask`, userId)).toBe(
        true,
      );
      expect(isUserRateLimitKey(`free_referral_bonus:${userId}`, userId)).toBe(
        true,
      );
      expect(
        isUserRateLimitKey(`free_referral_bonus_grant:ref:${userId}`, userId),
      ).toBe(true);
      expect(
        isUserRateLimitKey(`free_agent_limit:${userId}:agent`, userId),
      ).toBe(true);
      expect(
        isUserRateLimitKey(`free_monthly_cost:${userId}:2026-06`, userId),
      ).toBe(true);
      expect(isUserRateLimitKey(`free_run_lock:${userId}`, userId)).toBe(true);
      expect(
        isUserRateLimitKey(`team:debt_applied:org_123:${userId}`, userId),
      ).toBe(true);
    });

    it("rejects unrelated keys that contain the same user id", () => {
      expect(isUserRateLimitKey(`chat:${userId}:messages`, userId)).toBe(false);
      expect(
        isUserRateLimitKey(`team:removed_usage:org_${userId}`, userId),
      ).toBe(false);
      expect(isUserRateLimitKey(`usage:monthly:user_456:pro`, userId)).toBe(
        false,
      );
    });
  });

  // ==========================================================================
  // Cost calculation integration scenarios
  // ==========================================================================
  describe("cost calculation scenarios", () => {
    it("typical conversation costs zero points (all-free inference)", () => {
      // Typical: 2000 input tokens, 500 output tokens. Every route is free so
      // token usage never depletes the credit pool.
      const inputCost = calculateTokenCost(2000, "input");
      const outputCost = calculateTokenCost(500, "output");
      const totalCost = inputCost + outputCost;

      expect(inputCost).toBe(0);
      expect(outputCost).toBe(0);
      expect(totalCost).toBe(0);
    });

    it("pro user can run unlimited typical conversations with zero token cost", () => {
      const typicalCost = calculateTokenCost(2000, "input") +
        calculateTokenCost(500, "output");

      expect(typicalCost).toBe(0);
    });

    it("long context and short context requests both cost zero", () => {
      const longContextCost = calculateTokenCost(100_000, "input");
      const shortContextCost = calculateTokenCost(1_000, "input");

      expect(longContextCost).toBe(0);
      expect(shortContextCost).toBe(0);
      expect(longContextCost).toBe(shortContextCost);
    });

    it("heavy output requests cost zero like every other request", () => {
      // Agent generating lots of code
      const inputCost = calculateTokenCost(5000, "input");
      const outputCost = calculateTokenCost(10000, "output");

      expect(inputCost).toBe(0);
      expect(outputCost).toBe(0);
    });
  });

  // ==========================================================================
  // Proration calculation logic
  // ==========================================================================
  describe("calculateTierChangeCredits", () => {
    it("adds the prorated plan difference for an exhausted Pro→Pro+ upgrade", () => {
      const result = calculateTierChangeCredits(
        600_000,
        250_000,
        0,
        0.41581478,
      );

      expect(result).toEqual({
        consumedCredits: 250_000,
        incrementalCredits: 145_535,
        cycleAllocation: 395_535,
        remainingCredits: 145_535,
      });
    });

    it("preserves unused old credits and adds only the prorated difference", () => {
      const result = calculateTierChangeCredits(
        600_000,
        250_000,
        80_000,
        1 / 3,
      );

      expect(result).toEqual({
        consumedCredits: 170_000,
        incrementalCredits: 116_666,
        cycleAllocation: 366_666,
        remainingCredits: 196_666,
      });
    });

    it("uses the stored cycle allocation for grandfathered plans", () => {
      const result = calculateTierChangeCredits(600_000, 200_000, 50_000, 0.5);

      expect(result).toEqual({
        consumedCredits: 150_000,
        incrementalCredits: 200_000,
        cycleAllocation: 400_000,
        remainingCredits: 250_000,
      });
    });

    it("caps a downgrade without restoring consumed usage", () => {
      const result = calculateTierChangeCredits(250_000, 600_000, 400_000, 0.5);

      expect(result).toEqual({
        consumedCredits: 200_000,
        incrementalCredits: 0,
        cycleAllocation: 250_000,
        remainingCredits: 50_000,
      });
    });

    it("clamps invalid remaining credits and proration ratios", () => {
      expect(calculateTierChangeCredits(600_000, 250_000, 999_999, 2)).toEqual({
        consumedCredits: 0,
        incrementalCredits: 350_000,
        cycleAllocation: 600_000,
        remainingCredits: 600_000,
      });
    });
  });

  // ==========================================================================
  // Per-model pricing - calculateTokenCost with modelName parameter
  // ==========================================================================
  describe("per-model pricing", () => {
    it("should use zero default pricing when no modelName is provided", () => {
      // All inference is free; default pricing is now zeroed out.
      expect(calculateTokenCost(1_000_000, "input")).toBe(0);
      expect(calculateTokenCost(1_000_000, "output")).toBe(0);
    });

    it("should use zero default pricing for unknown model names", () => {
      expect(calculateTokenCost(1_000_000, "input", "unknown-model")).toBe(0);
      expect(calculateTokenCost(1_000_000, "output", "unknown-model")).toBe(0);
    });

    it.each([
      "model-deepseek-v4-pro",
      "model-glm-5.2",
      "model-kimi-k3",
      "model-opus-4.6",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-flash-20260423",
      "deepseek/deepseek-v4-flash-0731",
      "deepseek/deepseek-v4-flash-20260731",
      "model-grok-4.5",
      "model-grok-4.5-pro",
      "model-grok-4.6-pro",
      "model-glm-5.2-free",
      "z-ai/glm-5.2",
      "z-ai/glm-5.2:free",
      "glm-5.2-20260616",
      "nvidia/nemotron-3-super-120b-a12b:free",
    ])("should cost zero points for model %s (all-free)", (modelName) => {
      expect(calculateTokenCost(1_000_000, "input", modelName)).toBe(0);
      expect(calculateTokenCost(1_000_000, "output", modelName)).toBe(0);
    });

    it.each([
      "ask-model-free",
      "agent-model-free",
      "ask-model",
      "agent-model",
      "fallback-agent-model",
      "fallback-ask-model",
      "title-generator-model",
      "agent-auto-review-model",
    ])("should cost zero points for route key %s (all-free)", (modelName) => {
      expect(calculateTokenCost(1_000_000, "input", modelName)).toBe(0);
      expect(calculateTokenCost(1_000_000, "output", modelName)).toBe(0);
    });

    it("returns zero cost for long-context requests at any prompt size", () => {
      expect(
        calculateRawModelUsageCostDollars({
          inputTokens: 199_999,
          outputTokens: 10_000,
          modelName: "model-grok-4.6-pro",
        }),
      ).toBe(0);
      expect(
        calculateRawModelUsageCostDollars({
          inputTokens: 200_000,
          outputTokens: 10_000,
          modelName: "x-ai/grok-4.6",
        }),
      ).toBe(0);
      expect(
        calculateTokenCost(10_000, "output", "model-grok-4.6-pro", 200_000),
      ).toBe(0);
    });

    it("every model depletes the budget at the same (zero) rate", () => {
      const monthlyBudget = getBudgetLimits("pro").monthly;
      // Typical conversation: 2000 input + 500 output tokens
      const defaultCost =
        calculateTokenCost(2000, "input") + calculateTokenCost(500, "output");
      const kimiK3Cost =
        calculateTokenCost(2000, "input", "model-kimi-k3") +
        calculateTokenCost(500, "output", "model-kimi-k3");

      expect(defaultCost).toBe(0);
      expect(kimiK3Cost).toBe(0);
      expect(defaultCost).toBe(kimiK3Cost);
      expect(monthlyBudget).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Team seat rotation protection - budget constants
  // ==========================================================================
  describe("team seat rotation protection", () => {
    it("team tier should have 400k monthly credits ($40)", () => {
      const teamLimits = getBudgetLimits("team");
      expect(teamLimits.monthly).toBe(400_000);
    });

    it("team member consuming all credits should equal tier max", () => {
      const teamMax = getBudgetLimits("team").monthly;
      // consumed = teamMax - remaining; when remaining=0, consumed=teamMax
      const consumed = teamMax - 0;
      expect(consumed).toBe(400_000);
    });

    it("partial consumption should be correctly calculated", () => {
      const teamMax = getBudgetLimits("team").monthly;
      const remaining = 150_000;
      const consumed = teamMax - remaining;
      expect(consumed).toBe(250_000);
    });

    it("seat debt should be capped at one seat's worth (400k)", () => {
      const teamMax = getBudgetLimits("team").monthly;
      // Even if org debt is 800k (2 members removed), each new member absorbs at most 400k
      const orgDebt = 800_000;
      const debit = Math.min(orgDebt, teamMax);
      expect(debit).toBe(400_000);
    });

    it("seat debt should handle zero remaining debt", () => {
      const orgDebt = 0;
      const teamMax = getBudgetLimits("team").monthly;
      const debit = Math.min(orgDebt, teamMax);
      expect(debit).toBe(0);
    });
  });
});
