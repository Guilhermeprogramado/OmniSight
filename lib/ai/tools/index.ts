import { DefaultSandboxManager } from "./utils/sandbox-manager";
import {
  HybridSandboxManager,
  type SandboxPreference,
} from "./utils/hybrid-sandbox-manager";
import { TodoManager } from "./utils/todo-manager";
import { createRunTerminalCmd } from "./run-terminal-cmd";
import { createInteractTerminalSession } from "./interact-terminal-session";
import { createGetTerminalFiles } from "./get-terminal-files";
import { createFile } from "./file";
import { createWebSearch } from "./web-search";
import { createOpenUrlTool } from "./open-url";
import { createTodoWrite } from "./todo-write";
import {
  createCreateNote,
  createListNotes,
  createUpdateNote,
  createDeleteNote,
} from "./notes";
// match tool removed — usage analytics showed it wasn't being used enough to justify
// the added complexity. The agent should use run_terminal_cmd with rg instead.
// import { createMatch } from "./match";
import type { ToolSet, UIMessageStreamWriter } from "ai";
import type {
  ChatMode,
  ToolContext,
  Todo,
  AnySandbox,
  AppendMetadataStreamFn,
  SubscriptionTier,
  SandboxBootInfo,
  ToolFailureLogger,
  AgentToolApprovalRequester,
  AgentActiveTimeMeasurer,
  SandboxManager,
} from "@/types";
import { isAgentMode } from "@/lib/utils/mode-helpers";
import type { Geo } from "@vercel/functions";
import { FileAccumulator } from "./utils/file-accumulator";
import { BackgroundProcessTracker } from "./utils/background-process-tracker";
import { ptySessionManager } from "./utils/pty-session-manager";
import { createPtyParserLogBudget } from "./utils/pty-output-formatter";
import { isE2BSandbox } from "./utils/sandbox-types";
import { getSandboxWithFallbackGuard } from "./utils/sandbox-fallback";
import { createE2BResourcePressureObserver } from "@/lib/analytics/sandbox-resource-pressure";
import { E2B_COST_PER_MS } from "./utils/e2b-cost";

export { isE2BSandbox };

// Factory function to create tools with context
export const createTools = (
  userID: string,
  chatId: string,
  writer: UIMessageStreamWriter,
  mode: ChatMode = "agent",
  userLocation: Geo,
  initialTodos?: Todo[],
  notesEnabled: boolean = true,
  assistantMessageId?: string,
  sandboxPreference?: SandboxPreference,
  serviceKey?: string,
  appendMetadataStream?: AppendMetadataStreamFn,
  onToolCost?: (costDollars: number) => void,
  subscription?: SubscriptionTier,
  onSandboxBoot?: (info: SandboxBootInfo) => void,
  modelName?: string,
  onToolFailure?: ToolFailureLogger,
  requestToolApproval?: AgentToolApprovalRequester,
  autoReviewEvidenceEnabled?: boolean,
  measureAgentActiveTime?: AgentActiveTimeMeasurer,
  workingDirectory?: string,
  triggerRunId?: string,
) => {
  let sandbox: AnySandbox | null = null;
  let sandboxFirstUsedAt: number | null = null;
  let currentModelName = modelName;

  const trackSandboxUsage = (newSandbox: AnySandbox) => {
    sandbox = newSandbox;
    if (!sandboxFirstUsedAt && isE2BSandbox(newSandbox)) {
      sandboxFirstUsedAt = Date.now();
    }
  };

  // Use HybridSandboxManager if sandboxPreference and serviceKey are provided
  const sandboxManager: SandboxManager =
    sandboxPreference && serviceKey
      ? new HybridSandboxManager(
          userID,
          trackSandboxUsage,
          sandboxPreference,
          serviceKey,
          isE2BSandbox(sandbox) ? sandbox : null,
          subscription,
          onSandboxBoot,
          workingDirectory,
          triggerRunId,
        )
      : new DefaultSandboxManager(
          userID,
          trackSandboxUsage,
          isE2BSandbox(sandbox) ? sandbox : null,
          onSandboxBoot,
        );

  const todoManager = new TodoManager(initialTodos);
  const fileAccumulator = new FileAccumulator();
  const backgroundProcessTracker = new BackgroundProcessTracker();
  const onSandboxResourceMetrics = createE2BResourcePressureObserver({
    userId: userID,
    chatId,
    mode,
    subscription,
    triggerRunId,
  });

  const context: ToolContext = {
    sandboxManager,
    writer,
    userLocation,
    todoManager,
    userID,
    chatId,
    assistantMessageId,
    triggerRunId,
    fileAccumulator,
    backgroundProcessTracker,
    ptySessionManager,
    ptyParserLogBudget: createPtyParserLogBudget(),
    mode,
    modelName,
    getCurrentModelName: () => currentModelName,
    subscription,
    isE2BSandbox,
    appendMetadataStream,
    onToolCost,
    onToolFailure,
    requestToolApproval,
    autoReviewEvidenceEnabled,
    measureAgentActiveTime,
    onSandboxResourceMetrics,
  };

  const buildTools = (): ToolSet => {
    // Create all available tools. This is intentionally a factory rather than a
    // one-time object so model-specific tool schemas can be rebuilt for
    // provider fallback legs.
    const allTools = {
      run_terminal_cmd: createRunTerminalCmd(context),
      interact_terminal_session: createInteractTerminalSession(context),
      get_terminal_files: createGetTerminalFiles(context),
      file: createFile(context),
      todo_write: createTodoWrite(context),
      ...(notesEnabled && {
        create_note: createCreateNote(context),
        list_notes: createListNotes(context),
        update_note: createUpdateNote(context),
        delete_note: createDeleteNote(context),
      }),
      ...(process.env.PERPLEXITY_API_KEY && {
        web_search: createWebSearch(context),
      }),
      ...(process.env.JINA_API_KEY && {
        open_url: createOpenUrlTool(context),
      }),
    };

    // Filter tools based on mode. Free users (no confirmed Stripe payment) keep
    // Ask-mode tools but get NO Agent tools. Paid tiers and allowlisted dev
    // emails (resolved to "ultra" upstream) keep the full toolset. This is the
    // single enforcement point for both the chat-handler and the agent-long
    // trigger pipeline.
    if (mode === "ask") {
      return {
        ...(notesEnabled && {
          create_note: allTools.create_note,
          list_notes: allTools.list_notes,
          update_note: allTools.update_note,
          delete_note: allTools.delete_note,
        }),
        ...(process.env.PERPLEXITY_API_KEY && {
          web_search: createWebSearch(context),
        }),
        ...(process.env.JINA_API_KEY && {
          open_url: createOpenUrlTool(context),
        }),
      };
    }

    if (subscription === "free") return {};

    return allTools;
  };

  const tools = buildTools();

  const getSandbox = () => sandbox;
  const ensureSandbox = async (options?: {
    refresh?: boolean;
    reason?: string;
    excludeConnectionId?: string;
  }) => {
    if (options?.excludeConnectionId) {
      // HybridSandboxManager treats this as a strict retry: quarantine the
      // selected computer and reject acquisition before choosing another host.
      await sandboxManager.quarantineLocalConnection?.(
        options.excludeConnectionId,
        "command_unresponsive",
      );
    }
    if (options?.refresh) {
      await sandboxManager.resetSandbox?.(options.reason);
    }
    const { sandbox: ensured } = await getSandboxWithFallbackGuard({
      sandboxManager,
    });
    return ensured;
  };
  const getTodoManager = () => todoManager;
  const getFileAccumulator = () => fileAccumulator;
  const setCurrentModelName = (nextModelName: string | undefined) => {
    currentModelName = nextModelName;
  };

  const getToolsForModel = (nextModelName: string | undefined) => {
    setCurrentModelName(nextModelName);
    return buildTools();
  };

  const getSandboxSessionCost = (): number => {
    if (!sandboxFirstUsedAt) return 0;
    return (Date.now() - sandboxFirstUsedAt) * E2B_COST_PER_MS;
  };

  return {
    tools,
    getSandbox,
    ensureSandbox,
    getTodoManager,
    getFileAccumulator,
    sandboxManager,
    getSandboxSessionCost,
    setCurrentModelName,
    getToolsForModel,
  };
};

// Re-export types for external use
export type { SandboxPreference };
