import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Paperclip } from "lucide-react";
import { useGlobalState } from "../contexts/GlobalState";
import { useEffect, useRef, useState } from "react";
import { redirectToPricing } from "../hooks/usePricingDialog";
import { captureUpgradeCtaImpression } from "@/lib/analytics/client";
import type { ChatMode } from "@/types/chat";
import { isAgentMode } from "@/lib/utils/mode-helpers";

interface AttachmentButtonProps {
  onAttachClick: () => void;
  disabled?: boolean;
  mode?: ChatMode;
}

export const AttachmentButton = ({
  onAttachClick,
  disabled = false,
  mode = "ask",
}: AttachmentButtonProps) => {
  const { subscription, isCheckingProPlan } = useGlobalState();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const capturedImpressionRef = useRef(false);

  useEffect(() => {
    if (!popoverOpen || capturedImpressionRef.current) return;

    capturedImpressionRef.current = true;
    captureUpgradeCtaImpression({
      surface: "file_attachment_popover",
      source: "file_attachment_gate",
      from_tier: subscription,
      cta_text: "Upgrade now",
    });
  }, [popoverOpen, subscription]);

  // Ask mode file uploads are available to all plans. Agent mode uploads
  // (which stage files into a paid sandbox) still require a paid plan.
  const requiresPaidUpload = subscription === "free" && isAgentMode(mode);

  const handleClick = () => {
    if (!requiresPaidUpload) {
      onAttachClick();
    } else {
      setPopoverOpen(true);
    }
  };

  const handleUpgradeClick = () => {
    // Close the popover first
    setPopoverOpen(false);
    // Navigate to pricing page
    redirectToPricing({
      surface: "file_attachment_popover",
      source: "file_attachment_gate",
      from_tier: subscription,
      cta_text: "Upgrade now",
    });
  };

  // If uploads require a paid plan (agent mode on free tier), show upgrade popover
  if (!requiresPaidUpload || isCheckingProPlan) {
    return (
      <TooltipPrimitive.Root>
        <TooltipTrigger asChild>
          <Button
            type="button"
            onClick={onAttachClick}
            variant="ghost"
            size="sm"
            className="rounded-full p-0 w-8 h-8 min-w-0"
            aria-label="Attach files"
            data-testid="attach-files-button"
            disabled={disabled || isCheckingProPlan}
          >
            <Paperclip className="w-[15px] h-[15px]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Add files</p>
        </TooltipContent>
      </TooltipPrimitive.Root>
    );
  }

  // If user doesn't have pro plan, show popover with upgrade option
  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          onClick={handleClick}
          variant="ghost"
          size="sm"
          className="rounded-full p-0 w-8 h-8 min-w-0"
          aria-label="Attach files"
          data-testid="attach-files-button"
          disabled={disabled}
        >
          <Paperclip className="w-[15px] h-[15px]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-4"
        side="top"
        align="start"
        data-testid="file-attach-upgrade-dialog"
      >
        <div className="space-y-3">
          <h3 className="font-semibold text-base">Upgrade plan</h3>
          <p className="text-sm text-muted-foreground">
            Get access to file attachments and more features with Pro
          </p>
          <Button
            onClick={handleUpgradeClick}
            className="w-full"
            data-testid="file-attach-upgrade-button"
          >
            Upgrade now
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
