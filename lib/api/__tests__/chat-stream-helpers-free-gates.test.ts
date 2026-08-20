import {
  assertFreeAgentGates,
  assertChatModeAccess,
  countFileAttachments,
  stripImageAttachments,
} from "@/lib/api/chat-stream-helpers";
import { ChatSDKError } from "@/lib/errors";

jest.mock("@/lib/db/actions", () => ({
  getNotes: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

describe("assertFreeAgentGates", () => {
  it("rejects free agent mode with a local sandbox until payment is confirmed", () => {
    expect(() =>
      assertFreeAgentGates({
        mode: "agent",
        subscription: "free",
        sandboxPreference: "desktop",
      }),
    ).toThrow(ChatSDKError);
  });

  it("rejects free agent mode with the cloud (E2B) sandbox", () => {
    expect(() =>
      assertFreeAgentGates({
        mode: "agent",
        subscription: "free",
        sandboxPreference: "e2b",
      }),
    ).toThrow(ChatSDKError);
  });

  it("rejects free agent mode with no explicit sandbox", () => {
    expect(() =>
      assertFreeAgentGates({
        mode: "agent",
        subscription: "free",
        sandboxPreference: undefined,
      }),
    ).toThrow(ChatSDKError);
  });

  it("allows Ask mode for free users", () => {
    expect(() =>
      assertFreeAgentGates({ mode: "ask", subscription: "free" }),
    ).not.toThrow();
  });
});

describe("assertChatModeAccess", () => {
  it.each([undefined, null, "temporary", "Agent", 1])(
    "rejects invalid chat mode %p",
    (mode) => {
      expect(() =>
        assertChatModeAccess({ mode, subscription: "free" }),
      ).toThrow(ChatSDKError);
    },
  );

  it.each(["pro", "pro-plus", "ultra", "team"] as const)(
    "rejects Ask mode for %s users",
    (subscription) => {
      expect(() => assertChatModeAccess({ mode: "ask", subscription })).toThrow(
        ChatSDKError,
      );
    },
  );

  it("allows Ask mode for free users", () => {
    expect(() =>
      assertChatModeAccess({ mode: "ask", subscription: "free" }),
    ).not.toThrow();
  });

  it.each(["free", "pro", "pro-plus", "ultra", "team"] as const)(
    "allows Agent mode for %s users",
    (subscription) => {
      expect(() =>
        assertChatModeAccess({ mode: "agent", subscription }),
      ).not.toThrow();
    },
  );
});

describe("free-tier image attachment helpers", () => {
  it("counts image files separately from other attachments", () => {
    expect(
      countFileAttachments([
        {
          parts: [
            { type: "text" },
            { type: "file", mediaType: "image/png" },
            { type: "file", mediaType: "application/pdf" },
          ],
        },
        {
          parts: [
            { type: "file", mediaType: "image/jpeg" },
            { type: "tool-result" },
          ],
        },
      ]),
    ).toEqual({ totalFiles: 3, imageCount: 2 });
  });

  it("replaces image-only messages with a text placeholder and preserves non-image parts", () => {
    const messages = [
      {
        id: "mixed",
        parts: [
          { type: "text", text: "Please inspect these files." },
          {
            type: "file",
            mediaType: "image/png",
            url: "data:image/png;base64,a",
          },
          { type: "file", mediaType: "application/pdf", url: "file.pdf" },
        ],
      },
      {
        id: "image-only",
        parts: [
          {
            type: "file",
            mediaType: "image/jpeg",
            url: "data:image/jpeg;base64,b",
          },
        ],
      },
    ];

    const stripped = stripImageAttachments(messages);

    expect(stripped[0]).toEqual({
      id: "mixed",
      parts: [
        { type: "text", text: "Please inspect these files." },
        { type: "file", mediaType: "application/pdf", url: "file.pdf" },
      ],
    });
    expect(stripped[1]).toEqual({
      id: "image-only",
      parts: [
        {
          type: "text",
          text: "[Image attachment hidden — image attachments are a paid-plan feature and aren't available on the free plan.]",
        },
      ],
    });
    expect(messages[0].parts).toHaveLength(3);
  });
});
