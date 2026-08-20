import { describe, expect, it } from "@jest/globals";
import {
  getAgentFirstDefaultDecision,
  normalizeAgentFirstSandboxType,
  type AgentFirstDefaultEligibility,
  shouldDefaultFreeUserToAgent,
  shouldDefaultPaidUserToAgent,
  shouldDefaultProPlusUserToAgent,
  shouldDefaultUltraUserToAgent,
} from "../agent-first-default";

const baseEligibility: AgentFirstDefaultEligibility = {
  chatMode: "ask",
  defaultLocalSandboxPreference: "desktop",
  hasLocalSandbox: true,
  hasSavedChatMode: false,
  hasUserSelectedModeThisSession: false,
  isCheckingProPlan: false,
  isMobile: false,
  subscription: "free",
  subscriptionResolved: true,
  userPresent: true,
};

describe("shouldDefaultFreeUserToAgent", () => {
  it("never defaults free users to Agent since Agent tools require a confirmed Stripe payment", () => {
    expect(shouldDefaultFreeUserToAgent(baseEligibility)).toBe(false);
  });

  it("does not default free users with a saved mode preference to Agent", () => {
    expect(
      shouldDefaultFreeUserToAgent({
        ...baseEligibility,
        hasSavedChatMode: true,
      }),
    ).toBe(false);
  });

  it("does not default free users with a session-selected mode to Agent", () => {
    expect(
      shouldDefaultFreeUserToAgent({
        ...baseEligibility,
        hasUserSelectedModeThisSession: true,
      }),
    ).toBe(false);
  });

  it("does not default mobile free users to Agent", () => {
    expect(
      shouldDefaultFreeUserToAgent({
        ...baseEligibility,
        isMobile: true,
      }),
    ).toBe(false);
  });

  it("does not default free users without a local sandbox to Agent", () => {
    expect(
      shouldDefaultFreeUserToAgent({
        ...baseEligibility,
        defaultLocalSandboxPreference: null,
        hasLocalSandbox: false,
      }),
    ).toBe(false);
  });

  it("does not default paid users to Agent through the free-user experiment", () => {
    expect(
      shouldDefaultFreeUserToAgent({
        ...baseEligibility,
        subscription: "pro",
      }),
    ).toBe(false);
  });

  it("does not default to Agent while subscription status is being checked", () => {
    expect(
      shouldDefaultFreeUserToAgent({
        ...baseEligibility,
        isCheckingProPlan: true,
      }),
    ).toBe(false);
  });

  it("does not default before subscription status is resolved", () => {
    expect(
      shouldDefaultFreeUserToAgent({
        ...baseEligibility,
        subscriptionResolved: false,
      }),
    ).toBe(false);
  });
});

describe("shouldDefaultUltraUserToAgent", () => {
  const ultraEligibility: AgentFirstDefaultEligibility = {
    ...baseEligibility,
    defaultLocalSandboxPreference: null,
    hasLocalSandbox: false,
    subscription: "ultra",
  };

  it("defaults an eligible first-time Ultra user to Agent without requiring a local sandbox", () => {
    expect(shouldDefaultUltraUserToAgent(ultraEligibility)).toBe(true);
  });

  it("does not override a saved mode preference", () => {
    expect(
      shouldDefaultUltraUserToAgent({
        ...ultraEligibility,
        hasSavedChatMode: true,
      }),
    ).toBe(false);
  });

  it("does not override a mode selected during the current session", () => {
    expect(
      shouldDefaultUltraUserToAgent({
        ...ultraEligibility,
        hasUserSelectedModeThisSession: true,
      }),
    ).toBe(false);
  });

  it("does not default Pro or Pro Plus users through the Ultra default", () => {
    expect(
      shouldDefaultUltraUserToAgent({
        ...ultraEligibility,
        subscription: "pro",
      }),
    ).toBe(false);
    expect(
      shouldDefaultUltraUserToAgent({
        ...ultraEligibility,
        subscription: "pro-plus",
      }),
    ).toBe(false);
  });
});

describe("shouldDefaultProPlusUserToAgent", () => {
  const proPlusEligibility: AgentFirstDefaultEligibility = {
    ...baseEligibility,
    defaultLocalSandboxPreference: null,
    hasLocalSandbox: false,
    subscription: "pro-plus",
  };

  it("defaults an eligible first-time Pro Plus user to Agent without requiring a local sandbox", () => {
    expect(shouldDefaultProPlusUserToAgent(proPlusEligibility)).toBe(true);
  });

  it("does not override a saved mode preference", () => {
    expect(
      shouldDefaultProPlusUserToAgent({
        ...proPlusEligibility,
        hasSavedChatMode: true,
      }),
    ).toBe(false);
  });

  it("does not override a mode selected during the current session", () => {
    expect(
      shouldDefaultProPlusUserToAgent({
        ...proPlusEligibility,
        hasUserSelectedModeThisSession: true,
      }),
    ).toBe(false);
  });

  it("does not default Pro or Ultra users through the Pro Plus default", () => {
    expect(
      shouldDefaultProPlusUserToAgent({
        ...proPlusEligibility,
        subscription: "pro",
      }),
    ).toBe(false);
    expect(
      shouldDefaultProPlusUserToAgent({
        ...proPlusEligibility,
        subscription: "ultra",
      }),
    ).toBe(false);
  });
});

describe("shouldDefaultPaidUserToAgent", () => {
  const paidEligibility: AgentFirstDefaultEligibility = {
    ...baseEligibility,
    defaultLocalSandboxPreference: null,
    hasLocalSandbox: false,
  };

  it.each(["pro", "pro-plus", "ultra", "team"] as const)(
    "defaults eligible first-time %s users to Agent without requiring a local sandbox",
    (subscription) => {
      expect(
        shouldDefaultPaidUserToAgent({
          ...paidEligibility,
          subscription,
        }),
      ).toBe(true);
    },
  );

  it("does not treat the free local-sandbox default as a paid default", () => {
    expect(shouldDefaultPaidUserToAgent(baseEligibility)).toBe(false);
  });

  it("does not override a saved mode preference", () => {
    expect(
      shouldDefaultPaidUserToAgent({
        ...paidEligibility,
        subscription: "pro",
        hasSavedChatMode: true,
      }),
    ).toBe(false);
  });

  it("does not override a mode selected during the current session", () => {
    expect(
      shouldDefaultPaidUserToAgent({
        ...paidEligibility,
        subscription: "pro",
        hasUserSelectedModeThisSession: true,
      }),
    ).toBe(false);
  });
});

describe("getAgentFirstDefaultDecision", () => {
  it("returns null for free users since Agent tools require a confirmed Stripe payment", () => {
    expect(getAgentFirstDefaultDecision(baseEligibility)).toBeNull();
  });

  it("returns the Pro decision without the local sandbox requirement", () => {
    expect(
      getAgentFirstDefaultDecision({
        ...baseEligibility,
        defaultLocalSandboxPreference: null,
        hasLocalSandbox: false,
        subscription: "pro",
      }),
    ).toEqual({
      eligibleSubscriptionTier: "pro",
      experimentKey: "pro_agent_default_v1",
      selectionReason: "eligible_pro_user",
      useDefaultLocalSandbox: false,
    });
  });

  it("returns the Ultra decision without the local sandbox requirement", () => {
    expect(
      getAgentFirstDefaultDecision({
        ...baseEligibility,
        defaultLocalSandboxPreference: null,
        hasLocalSandbox: false,
        subscription: "ultra",
      }),
    ).toEqual({
      eligibleSubscriptionTier: "ultra",
      experimentKey: "ultra_agent_default_v1",
      selectionReason: "eligible_ultra_user",
      useDefaultLocalSandbox: false,
    });
  });

  it("returns the Pro Plus decision without the local sandbox requirement", () => {
    expect(
      getAgentFirstDefaultDecision({
        ...baseEligibility,
        defaultLocalSandboxPreference: null,
        hasLocalSandbox: false,
        subscription: "pro-plus",
      }),
    ).toEqual({
      eligibleSubscriptionTier: "pro-plus",
      experimentKey: "pro_plus_agent_default_v1",
      selectionReason: "eligible_pro_plus_user",
      useDefaultLocalSandbox: false,
    });
  });

  it("returns the Team decision without the local sandbox requirement", () => {
    expect(
      getAgentFirstDefaultDecision({
        ...baseEligibility,
        defaultLocalSandboxPreference: null,
        hasLocalSandbox: false,
        subscription: "team",
      }),
    ).toEqual({
      eligibleSubscriptionTier: "team",
      experimentKey: "team_agent_default_v1",
      selectionReason: "eligible_team_user",
      useDefaultLocalSandbox: false,
    });
  });
});

describe("normalizeAgentFirstSandboxType", () => {
  it("returns none when no sandbox preference is available", () => {
    expect(normalizeAgentFirstSandboxType(null)).toBe("none");
  });

  it("preserves known non-identifying sandbox types", () => {
    expect(normalizeAgentFirstSandboxType("desktop")).toBe("desktop");
    expect(normalizeAgentFirstSandboxType("e2b")).toBe("e2b");
  });

  it("buckets remote connection ids without returning the raw id", () => {
    expect(normalizeAgentFirstSandboxType("conn_remote_123")).toBe(
      "remote-connection",
    );
  });
});
