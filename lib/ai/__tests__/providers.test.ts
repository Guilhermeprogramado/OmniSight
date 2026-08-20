import {
  getModelCutoffDate,
  getModelDisplayName,
  isAnthropicModel,
  isKimiModel,
  createTrackedProvider,
  myProvider,
  sanitizeOpenRouterRequestForXai,
  supportsMultimodalToolResults,
  buildProviderMap,
  FREE_MODEL_SLUG,
  NVIDIA_BUILD_MODEL_SLUG,
  GLM_5_2_FREE_SLUG,
} from "@/lib/ai/providers";

describe("provider registry", () => {
  const FREE_SLUG = "nvidia/nemotron-3-super-120b-a12b:free";
  const GLM_FREE_SLUG = "z-ai/glm-5.2:free";

  it("keeps active routes pointed at free provider slugs", () => {
    expect(
      (myProvider.languageModel("ask-model") as { modelId: string }).modelId,
    ).toBe(FREE_SLUG);
    expect(
      (myProvider.languageModel("agent-model") as { modelId: string }).modelId,
    ).toBe(FREE_SLUG);
    expect(
      (myProvider.languageModel("ask-model-free") as { modelId: string })
        .modelId,
    ).toBe(FREE_SLUG);
    expect(
      (myProvider.languageModel("agent-model-free") as { modelId: string })
        .modelId,
    ).toBe(FREE_SLUG);
    expect(
      (myProvider.languageModel("model-grok-4.5") as { modelId: string })
        .modelId,
    ).toBe(FREE_SLUG);
    expect(
      (myProvider.languageModel("model-grok-4.5-pro") as { modelId: string })
        .modelId,
    ).toBe(FREE_SLUG);
    expect(
      (myProvider.languageModel("model-grok-4.6-pro") as { modelId: string })
        .modelId,
    ).toBe(FREE_SLUG);
    expect(
      (myProvider.languageModel("model-deepseek-v4-pro") as { modelId: string })
        .modelId,
    ).toBe(FREE_SLUG);
    expect(
      (myProvider.languageModel("model-glm-5.2") as { modelId: string })
        .modelId,
    ).toBe(FREE_SLUG);
    expect(
      (myProvider.languageModel("model-kimi-k3") as { modelId: string })
        .modelId,
    ).toBe(FREE_SLUG);
    expect(
      (myProvider.languageModel("model-opus-4.6") as { modelId: string })
        .modelId,
    ).toBe(FREE_SLUG);
    expect(
      (myProvider.languageModel("model-glm-5.2-free") as { modelId: string })
        .modelId,
    ).toBe(GLM_FREE_SLUG);
    expect(
      (myProvider.languageModel("fallback-agent-model") as { modelId: string })
        .modelId,
    ).toBe(FREE_SLUG);
    expect(
      (myProvider.languageModel("fallback-ask-model") as { modelId: string })
        .modelId,
    ).toBe(FREE_SLUG);
    expect(
      (myProvider.languageModel("title-generator-model") as { modelId: string })
        .modelId,
    ).toBe(FREE_SLUG);
    expect(getModelCutoffDate("ask-model-free")).toBeUndefined();
    expect(getModelCutoffDate("agent-model-free")).toBeUndefined();
    expect(getModelCutoffDate("model-grok-4.6-pro")).toBe("August 2026");
    expect(getModelCutoffDate("model-opus-4.6")).toBe("July 2026");
    expect(getModelDisplayName("model-grok-4.5")).toBe(
      "NVIDIA Nemotron 3 Super (free)",
    );
    expect(getModelDisplayName("model-grok-4.5-pro")).toBe(
      "NVIDIA Nemotron 3 Super (free)",
    );
    expect(getModelDisplayName("model-grok-4.6-pro")).toBe(
      "NVIDIA Nemotron 3 Super (free)",
    );
    expect(getModelDisplayName("model-glm-5.2")).toBe(
      "NVIDIA Nemotron 3 Super (free)",
    );
    expect(getModelDisplayName("model-kimi-k3")).toBe(
      "NVIDIA Nemotron 3 Super (free)",
    );
    expect(getModelDisplayName("model-opus-4.6")).toBe(
      "NVIDIA Nemotron 3 Super (free)",
    );
    expect(getModelDisplayName("model-glm-5.2-free")).toBe("Z.ai GLM 5.2 (free)");
    expect(getModelDisplayName("title-generator-model")).toBe(
      "NVIDIA Nemotron 3 Super (free)",
    );
  });

  it("applies Kimi rather than Anthropic provider behavior to OmniSight Max", () => {
    expect(isKimiModel("model-opus-4.6")).toBe(true);
    expect(isAnthropicModel("model-opus-4.6")).toBe(false);
    expect(isAnthropicModel("anthropic/claude-opus-4.6")).toBe(true);
  });

  it("keeps tracked free routes split by mode", () => {
    const provider = createTrackedProvider();
    expect(
      (provider.languageModel("ask-model-free") as { modelId: string }).modelId,
    ).toBe("nvidia/nemotron-3-super-120b-a12b:free");
    expect(
      (provider.languageModel("agent-model-free") as { modelId: string })
        .modelId,
    ).toBe("nvidia/nemotron-3-super-120b-a12b:free");
  });

  it("routes all free routes to the NVIDIA Build slug when NVIDIA is enabled", () => {
    const stubProvider = (slug: string) =>
      ({ modelId: slug, providerName: "stub" }) as any;
    const map = buildProviderMap(
      stubProvider,
      FREE_MODEL_SLUG,
      stubProvider,
      true,
    );
    const freeRoutes = [
      "ask-model",
      "ask-model-free",
      "agent-model",
      "agent-model-free",
      "model-grok-4.5",
      "model-grok-4.5-pro",
      "model-grok-4.6-pro",
      "model-deepseek-v4-pro",
      "model-opus-4.6",
      "model-glm-5.2",
      "model-glm-5.2-free",
      "model-kimi-k3",
      "fallback-agent-model",
      "fallback-ask-model",
      "title-generator-model",
      "agent-auto-review-model",
    ];
    for (const route of freeRoutes) {
      expect(
        (map[route] as { modelId: string }).modelId,
      ).toBe(NVIDIA_BUILD_MODEL_SLUG);
    }
  });

  it("keeps OpenRouter slugs when NVIDIA is disabled", () => {
    const stubProvider = (slug: string) =>
      ({ modelId: slug, providerName: "stub" }) as any;
    const map = buildProviderMap(stubProvider, FREE_MODEL_SLUG, stubProvider);
    expect((map["ask-model"] as { modelId: string }).modelId).toBe(FREE_MODEL_SLUG);
    expect(
      (map["model-glm-5.2-free"] as { modelId: string }).modelId,
    ).toBe(GLM_5_2_FREE_SLUG);
  });

  it.each([
    "model-sonnet-4.6",
    "model-gemini-3-flash",
    "model-minimax-m3",
    "model-kimi-k2.6",
    "model-kimi-k2.7-code",
    "model-deepseek-v4-flash",
    "fallback-grok-4.5",
  ])("does not register retired route %s", (modelName) => {
    expect(() => myProvider.languageModel(modelName)).toThrow();
  });
});

describe("sanitizeOpenRouterRequestForXai", () => {
  it("strips encrypted reasoning details when an OpenRouter fallback can route to xAI", () => {
    const body = {
      model: "moonshotai/kimi-k3",
      models: ["x-ai/grok-4.5"],
      messages: [
        {
          role: "assistant",
          content: "Here is the answer.",
          reasoning_details: [
            { type: "text", text: "plain reasoning detail" },
            {
              type: "reasoning.encrypted",
              data: "provider-private-reasoning-blob",
            },
            { type: "encrypted", encrypted_content: "legacy-provider-blob" },
          ],
        },
      ],
    };

    const result = sanitizeOpenRouterRequestForXai(body);

    expect(result.changed).toBe(true);
    expect(result.body).toEqual({
      ...body,
      messages: [
        {
          role: "assistant",
          content: "Here is the answer.",
          reasoning_details: [{ type: "text", text: "plain reasoning detail" }],
        },
      ],
    });
    expect(JSON.stringify(result.body)).not.toContain(
      "provider-private-reasoning-blob",
    );
    expect(JSON.stringify(result.body)).not.toContain("legacy-provider-blob");
    expect(JSON.stringify(body)).toContain("provider-private-reasoning-blob");
    expect(JSON.stringify(body)).toContain("legacy-provider-blob");
  });

  it("removes reasoning_details when every detail is encrypted", () => {
    const body = {
      model: "x-ai/grok-4.5",
      messages: [
        {
          role: "assistant",
          content: "Visible text stays.",
          reasoning_details: [
            { type: "reasoning.encrypted", data: "x-provider-blob" },
          ],
        },
      ],
    };

    const result = sanitizeOpenRouterRequestForXai(body);

    expect(result.changed).toBe(true);
    expect(result.body).toEqual({
      model: "x-ai/grok-4.5",
      messages: [
        {
          role: "assistant",
          content: "Visible text stays.",
        },
      ],
    });
  });

  it("leaves non-xAI routes unchanged", () => {
    const body = {
      model: "moonshotai/kimi-k3",
      messages: [
        {
          role: "assistant",
          content: "Here is the answer.",
          reasoning_details: [
            { type: "encrypted", encrypted_content: "provider-blob" },
          ],
        },
      ],
    };

    const result = sanitizeOpenRouterRequestForXai(body);

    expect(result.changed).toBe(false);
    expect(result.body).toBe(body);
  });

  it("preserves encrypted_content outside provider reasoning metadata", () => {
    const body = {
      model: "x-ai/grok-4.5",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please inspect this payload.",
            },
            {
              type: "input_json",
              encrypted_content: "user-owned-data",
            },
            {
              type: "reasoning.encrypted",
              data: "user-owned-reasoning-shaped-data",
            },
          ],
        },
        {
          role: "assistant",
          content: "Visible text stays.",
          tool_calls: [
            {
              id: "call_1",
              function: {
                name: "decrypt",
                arguments: JSON.stringify({
                  encrypted_content: "tool-owned-data",
                }),
              },
            },
          ],
        },
      ],
    };

    const result = sanitizeOpenRouterRequestForXai(body);

    expect(result.changed).toBe(false);
    expect(result.body).toBe(body);
    expect(JSON.stringify(result.body)).toContain("user-owned-data");
    expect(JSON.stringify(result.body)).toContain(
      "user-owned-reasoning-shaped-data",
    );
    expect(JSON.stringify(result.body)).toContain("tool-owned-data");
  });
});

describe("supportsMultimodalToolResults", () => {
  it("allows active Grok and Kimi routes for image tool results", () => {
    expect(supportsMultimodalToolResults("agent-model")).toBe(true);
    expect(supportsMultimodalToolResults("ask-model")).toBe(true);
    expect(supportsMultimodalToolResults("fallback-agent-model")).toBe(true);
    expect(supportsMultimodalToolResults("fallback-ask-model")).toBe(true);
    expect(supportsMultimodalToolResults("model-kimi-k3")).toBe(true);
    expect(supportsMultimodalToolResults("moonshotai/kimi-k3")).toBe(true);
  });

  it("allows active multimodal keys and slugs used after image tool results", () => {
    expect(supportsMultimodalToolResults("model-grok-4.5")).toBe(true);
    expect(supportsMultimodalToolResults("model-grok-4.5-pro")).toBe(true);
    expect(supportsMultimodalToolResults("model-grok-4.6-pro")).toBe(true);
    expect(supportsMultimodalToolResults("x-ai/grok-4.5")).toBe(true);
    expect(supportsMultimodalToolResults("x-ai/grok-4.6")).toBe(true);
  });

  it("rejects text-only DeepSeek model keys", () => {
    expect(supportsMultimodalToolResults("agent-model-free")).toBe(false);
    expect(supportsMultimodalToolResults("model-deepseek-v4-pro")).toBe(false);
  });

  it.each([
    "model-gemini-3-flash",
    "model-minimax-m3",
    "model-kimi-k2.6",
    "model-kimi-k2.7-code",
    "model-deepseek-v4-flash",
    "fallback-grok-4.5",
  ])("does not classify retired route %s as multimodal", (modelName) => {
    expect(supportsMultimodalToolResults(modelName)).toBe(false);
  });
});
