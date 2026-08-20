import { describe, expect, it } from "@jest/globals";
import { getPricingIntentCopy } from "../PricingDialog";

describe("getPricingIntentCopy", () => {
  it("uses generic copy for non-Agent limit pressure", () => {
    const copy = getPricingIntentCopy(
      {
        source: "limit_pressure",
        limitType: "free_monthly",
        reason: "free_monthly_exhausted",
      },
      "free",
    );

    expect(copy).toEqual(
      expect.objectContaining({
        title: "Continue trabalhando",
        description: expect.stringContaining("limites maiores"),
        mensalDescription: "Continue com limites maiores",
        mensalButtonText: "Assinar Mensal",
        vitalicioButtonText: "Assinar Vitalício",
      }),
    );
    expect(copy?.title).not.toContain("Agent");
    expect(copy?.description).not.toContain("Agent");
    expect(copy?.mensalDescription).not.toContain("Agent");
  });

  it("keeps Agent-specific copy for the Agent gate", () => {
    const copy = getPricingIntentCopy(
      {
        source: "agent_mode_gate",
      },
      "free",
    );

    expect(copy).toEqual(
      expect.objectContaining({
        title: "Desbloqueie o Agent na nuvem",
        mensalButtonText: "Assinar Mensal",
      }),
    );
  });

  it("uses the free Ask report limit copy for the cumulative gate", () => {
    const copy = getPricingIntentCopy(
      {
        source: "ask_report_limit",
        limitType: "free_ask_report_limit",
        reason: "free_ask_reports_exhausted",
      },
      "free",
    );

    expect(copy).toEqual(
      expect.objectContaining({
        title: "Limite de relatórios grátis atingido",
        description: expect.stringContaining("relatórios Ask grátis"),
        mensalDescription: "Relatórios ilimitados por mês",
        mensalButtonText: "Assinar Mensal",
        vitalicioButtonText: "Assinar Vitalício",
      }),
    );
  });

  it("returns null for users who already have a subscription", () => {
    const copy = getPricingIntentCopy(
      { source: "plan_cards" },
      "pro",
    );

    expect(copy).toBeNull();
  });
});
