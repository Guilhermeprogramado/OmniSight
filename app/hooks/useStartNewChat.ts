"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGlobalState } from "@/app/contexts/GlobalState";
import { redirectToPricing } from "@/app/hooks/usePricingDialog";
import { FREE_ASK_REPORT_LIMIT } from "@/lib/limit-pressure";

type StartNewChatOptions = {
  projectId?: string;
  useDesktop?: boolean;
};

export function useStartNewChat() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const {
    closeSidebar,
    initializeNewChat,
    setActiveProjectId,
    setChatSidebarOpen,
    setSandboxPreference,
    subscription,
    freeAskReportCount,
  } = useGlobalState();

  return useCallback(
    ({ projectId, useDesktop = false }: StartNewChatOptions = {}) => {
      // Free non-dev users may create 1 Ask report before they must upgrade.
      // Block opening a new conversation once reached.
      if (
        subscription === "free" &&
        typeof freeAskReportCount === "number" &&
        freeAskReportCount >= FREE_ASK_REPORT_LIMIT
      ) {
        redirectToPricing({
          surface: "new_chat",
          source: "ask_report_limit",
          from_tier: "free",
          reason: "free_ask_reports_exhausted",
          limit_type: "free_ask_report_limit",
        });
        return;
      }

      closeSidebar();
      if (isMobile) setChatSidebarOpen(false);

      initializeNewChat();
      setActiveProjectId(projectId ?? null);
      if (useDesktop) setSandboxPreference("desktop");

      router.push(
        projectId ? `/?project=${encodeURIComponent(projectId)}` : "/",
      );
    },
    [
      closeSidebar,
      freeAskReportCount,
      initializeNewChat,
      isMobile,
      router,
      setActiveProjectId,
      setChatSidebarOpen,
      setSandboxPreference,
      subscription,
    ],
  );
}