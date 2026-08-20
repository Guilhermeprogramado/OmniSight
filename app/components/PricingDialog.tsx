"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { Loader2, X } from "lucide-react";
import { useGlobalState } from "../contexts/GlobalState";
import { useUpgrade } from "../hooks/useUpgrade";
import { navigateToAuth } from "../hooks/useTauri";
import {
  mensalFeatures,
  vitalicioFeatures,
  PRICING,
  PLAN_HEADERS,
} from "@/lib/pricing/features";
import { isDevEmail } from "@/lib/auth/dev-access";
import UpgradeConfirmationDialog from "./UpgradeConfirmationDialog";
import { captureUpgradeCtaImpression } from "@/lib/analytics/client";
import type { PricingDialogContext } from "../hooks/usePricingDialog";

interface PricingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  context?: PricingDialogContext;
}

interface PlanCardProps {
  planName: string;
  price: number;
  currencySymbol: string;
  unitLabel: string;
  description: string;
  features: Array<{
    icon: React.ComponentType<{ className?: string }>;
    text: string;
  }>;
  buttonText: string;
  buttonVariant?: "default" | "secondary";
  buttonClassName?: string;
  onButtonClick?: () => void;
  isButtonDisabled?: boolean;
  isButtonLoading?: boolean;
  customClassName?: string;
  badgeText?: string;
  badgeClassName?: string;
  footerNote?: string;
  featureHeader?: string | null;
}

type PricingIntentCopy = {
  title: string;
  description: string;
  mensalDescription: string;
  vitalicioDescription: string;
  mensalButtonText: string;
  vitalicioButtonText: string;
};

export function getPricingIntentCopy(
  context: PricingDialogContext | undefined,
  subscription: string,
): PricingIntentCopy | null {
  if (subscription !== "free") return null;

  const source = context?.source;
  const limitType = context?.limitType;
  const reason = context?.reason;

  if (source === "agent_mode_gate") {
    return {
      title: "Desbloqueie o Agent na nuvem",
      description:
        "Use o Agent sem conectar um sandbox local, com limites maiores, upload de arquivos e modelos mais fortes.",
      mensalDescription: "Agent na nuvem e limites maiores",
      vitalicioDescription: "Tudo liberado, acesso vitalício",
      mensalButtonText: "Assinar Mensal",
      vitalicioButtonText: "Assinar Vitalício",
    };
  }

  if (
    source === "ask_report_limit" ||
    limitType === "free_ask_report_limit" ||
    reason === "free_ask_reports_exhausted"
  ) {
    return {
      title: "Limite de relatórios grátis atingido",
      description:
        "Você usou seus relatórios Ask grátis. Assine para continuar com relatórios ilimitados, limites maiores, upload de arquivos e modelos mais fortes.",
      mensalDescription: "Relatórios ilimitados por mês",
      vitalicioDescription: "Uso máximo, acesso vitalício",
      mensalButtonText: "Assinar Mensal",
      vitalicioButtonText: "Assinar Vitalício",
    };
  }

  if (
    source === "limit_pressure" ||
    source === "rate_limit_error" ||
    limitType === "free_monthly" ||
    limitType === "daily_requests" ||
    reason === "free_monthly_exhausted" ||
    reason === "daily_requests_exhausted"
  ) {
    return {
      title: "Continue trabalhando",
      description:
        "Assine para continuar hoje com limites maiores, upload de arquivos e modelos mais fortes para trabalhos de segurança pesados.",
      mensalDescription: "Continue com limites maiores",
      vitalicioDescription: "Uso máximo para testes intensivos",
      mensalButtonText: "Assinar Mensal",
      vitalicioButtonText: "Assinar Vitalício",
    };
  }

  return null;
}

const PlanCard: React.FC<PlanCardProps> = ({
  planName,
  price,
  currencySymbol,
  unitLabel,
  description,
  features,
  buttonText,
  buttonVariant = "secondary",
  buttonClassName = "",
  onButtonClick,
  isButtonDisabled = false,
  isButtonLoading = false,
  customClassName = "",
  badgeText,
  badgeClassName = "",
  footerNote,
  featureHeader,
}) => {
  return (
    <div
      className={`border border-border md:min-h-[30rem] md:rounded-2xl relative flex w-full min-w-0 flex-col justify-center gap-4 rounded-xl px-6 py-6 text-sm bg-background ${customClassName}`}
    >
      <div className="relative flex flex-col mt-0">
        <div className="flex flex-col gap-5">
          <div className="flex min-h-10 items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-[28px] font-medium leading-tight">
              <span>{planName}</span>
              {badgeText ? (
                <Badge
                  className={`border-none rounded-4xl px-2 pt-1.5 pb-1.25 text-[11px] font-semibold bg-[#DCDBFF] text-[#615EEB] dark:bg-[#444378] dark:text-[#B9B7FF] ${badgeClassName}`}
                >
                  {badgeText}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="flex items-end gap-1.5">
            <div className="flex text-foreground">
              <div className="text-2xl text-muted-foreground">
                {currencySymbol}
              </div>
              <div className="text-5xl">{price}</div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <div className="mt-auto mb-0.5 flex h-full flex-col items-start">
                <p className="text-muted-foreground w-full text-xs">
                  {unitLabel}
                </p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-foreground text-base mt-4 font-medium">
          {description}
        </p>
      </div>

      <div className="mb-2.5 w-full">
        <Button
          onClick={onButtonClick}
          disabled={isButtonDisabled}
          className={`w-full ${buttonClassName}`}
          variant={buttonVariant}
          size="lg"
        >
          {isButtonLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Assinando...
            </>
          ) : (
            buttonText
          )}
        </Button>
      </div>

      <div className="flex flex-col grow gap-2">
        {featureHeader && (
          <p className="text-base font-semibold mb-2">{featureHeader}</p>
        )}
        <ul className="mb-2 flex flex-col gap-5">
          {features.map((feature, index) => (
            <li key={index} className="relative">
              <div className="flex justify-start gap-3.5">
                <feature.icon className="h-5 w-5 shrink-0" />
                <span className="text-foreground font-normal">
                  {feature.text}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {footerNote ? (
        <p className="text-muted-foreground text-xs mt-auto">{footerNote}</p>
      ) : null}
    </div>
  );
};

const PricingDialog: React.FC<PricingDialogProps> = ({
  isOpen,
  onClose,
  context,
}) => {
  const { user } = useAuth();
  const { subscription, isCheckingProPlan } = useGlobalState();
  const { upgradeLoading, handleUpgrade } = useUpgrade();
  const capturedPricingCtaImpressionRef = React.useRef(false);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [pendingUpgrade, setPendingUpgrade] = React.useState<{
    plan: string;
    planName: string;
    price: number;
  } | null>(null);
  const pricingIntentCopy = getPricingIntentCopy(context, subscription);
  const isDev = isDevEmail((user as { email?: unknown } | null)?.email as
    | string
    | undefined);

  // Auto-close pricing dialog for ultra/team users (pro-plus can still upgrade to ultra)
  React.useEffect(() => {
    if (
      isOpen &&
      (subscription === "ultra" || subscription === "team") &&
      !isDev
    ) {
      onClose();
    }
  }, [isOpen, subscription, onClose, isDev]);

  React.useEffect(() => {
    if (!isOpen) {
      capturedPricingCtaImpressionRef.current = false;
      return;
    }

    if (capturedPricingCtaImpressionRef.current) return;
    capturedPricingCtaImpressionRef.current = true;
    captureUpgradeCtaImpression({
      surface: "pricing_dialog",
      source: context?.source ?? "plan_cards",
      from_tier: subscription,
      cta_text: "plan_card_buttons",
      ...(context?.reason && { reason: context.reason }),
      ...(context?.limitType && { limit_type: context.limitType }),
    });
  }, [
    context?.limitType,
    context?.reason,
    context?.source,
    isOpen,
    subscription,
  ]);

  const handleUpgradeClick = async (
    plan: "pro-monthly-plan" | "ultra-monthly-plan",
    planName: string,
    price: number,
  ) => {
    // If user is free, upgrade directly using checkout
    if (subscription === "free") {
      try {
        await handleUpgrade(plan, undefined, undefined, subscription, {
          source: context?.source ?? "plan_card",
          surface: "pricing_dialog",
          reason: context?.reason,
          limit_type: context?.limitType,
        });
        // Don't close dialog on success - let the redirect happen
      } catch (error) {
        console.error("Upgrade failed:", error);
      }
    } else {
      // For existing subscribers, show confirmation dialog with upgrade details
      setPendingUpgrade({ plan, planName, price });
      setShowConfirmDialog(true);
    }
  };

  const handleCloseConfirmDialog = () => {
    setShowConfirmDialog(false);
    setPendingUpgrade(null);
  };

  // Button configurations for Mensal plan (pro tier)
  const getMensalButtonConfig = () => {
    if (isDev && subscription === "ultra") {
      return {
        text: "Plano atual",
        disabled: true,
        className: "opacity-50 cursor-not-allowed",
        variant: "secondary" as const,
      };
    }
    if (user && !isCheckingProPlan && subscription === "pro") {
      return {
        text: "Plano atual",
        disabled: true,
        className: "opacity-50 cursor-not-allowed",
        variant: "secondary" as const,
      };
    } else if (user && (subscription === "ultra" || subscription === "team")) {
      // Ultra/Team users already have the full platform
      return {
        text: "Incluído no Vitalício",
        disabled: true,
        className: "opacity-50 cursor-not-allowed",
        variant: "secondary" as const,
      };
    } else if (user) {
      return {
        text: pricingIntentCopy?.mensalButtonText ?? "Assinar Mensal",
        disabled: upgradeLoading,
        className: "",
        variant: "default" as const,
        onClick: () =>
          handleUpgradeClick("pro-monthly-plan", "Mensal", PRICING.mensal),
        loading: upgradeLoading,
      };
    } else {
      return {
        text: "Assinar Mensal",
        disabled: false,
        className: "",
        variant: "default" as const,
        onClick: () =>
          navigateToAuth("/signup?intent=pricing", {
            preferSignInForReturningUser: true,
          }),
      };
    }
  };

  // Button configurations for Vitalício plan (ultra tier)
  const getVitalicioButtonConfig = () => {
    if (isDev && subscription === "ultra") {
      return {
        text: "Plano atual",
        disabled: true,
        className: "opacity-50 cursor-not-allowed",
        variant: "secondary" as const,
      };
    }
    if (user && !isCheckingProPlan && subscription === "ultra") {
      return {
        text: "Plano atual",
        disabled: true,
        className: "opacity-50 cursor-not-allowed",
        variant: "secondary" as const,
      };
    } else if (user && subscription === "team") {
      return {
        text: "Incluído no Team",
        disabled: true,
        className: "opacity-50 cursor-not-allowed",
        variant: "secondary" as const,
      };
    } else if (user) {
      return {
        text: pricingIntentCopy?.vitalicioButtonText ?? "Assinar Vitalício",
        disabled: upgradeLoading,
        className: "font-semibold bg-[#615eeb] hover:bg-[#504bb8] text-white",
        variant: "default" as const,
        onClick: () =>
          handleUpgradeClick("ultra-monthly-plan", "Vitalício", PRICING.vitalicio),
        loading: upgradeLoading,
      };
    } else {
      return {
        text: "Assinar Vitalício",
        disabled: false,
        className: "font-semibold bg-[#615eeb] hover:bg-[#504bb8] text-white",
        variant: "default" as const,
        onClick: () =>
          navigateToAuth("/signup?intent=pricing", {
            preferSignInForReturningUser: true,
          }),
      };
    }
  };

  const mensalButtonConfig = getMensalButtonConfig();
  const vitalicioButtonConfig = getVitalicioButtonConfig();

  return (
    <>
      <UpgradeConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={handleCloseConfirmDialog}
        planName={pendingUpgrade?.planName || ""}
        price={pendingUpgrade?.price || 0}
        targetPlan={pendingUpgrade?.plan || ""}
        source={context?.source ?? "plan_card"}
        surface="pricing_dialog"
        reason={context?.reason}
        limitType={context?.limitType}
      />

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="!max-w-none !w-screen !h-screen !max-h-none !m-0 !rounded-none !inset-0 !translate-x-0 !translate-y-0 !top-0 !left-0 overflow-y-auto"
          data-testid="modal-account-payment"
          showCloseButton={false}
        >
          <div className="relative grid grid-cols-[1fr_auto_1fr] px-6 py-4 md:pt-[4.5rem] md:pb-6">
            <div></div>
            <div className="my-1 flex flex-col items-center justify-center md:mt-0 md:mb-0">
              <DialogTitle className="text-3xl font-semibold">
                {pricingIntentCopy?.title ?? "Escolha seu plano"}
              </DialogTitle>
              {pricingIntentCopy && (
                <p className="text-muted-foreground mt-2 max-w-2xl text-center text-sm">
                  {pricingIntentCopy.description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-foreground justify-self-end opacity-50 transition hover:opacity-75 md:absolute md:end-6 md:top-6"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="px-6 pb-8">
            <div className="mx-auto grid w-full max-w-[88rem] grid-cols-1 gap-6 md:grid-cols-2">
              <PlanCard
                planName="Mensal"
                price={PRICING.mensal}
                currencySymbol="R$"
                unitLabel="/ mês"
                description={
                  pricingIntentCopy?.mensalDescription ??
                  "Entrega 60% das funcionalidades da plataforma"
                }
                features={mensalFeatures}
                buttonText={mensalButtonConfig.text}
                buttonVariant={mensalButtonConfig.variant}
                buttonClassName={mensalButtonConfig.className}
                onButtonClick={mensalButtonConfig.onClick}
                isButtonDisabled={mensalButtonConfig.disabled}
                isButtonLoading={mensalButtonConfig.loading}
                customClassName="order-1 md:order-none"
                featureHeader={PLAN_HEADERS.mensal}
                footerNote="Acesso mensal recorrente. Você pode cancelar quando quiser."
              />

              <PlanCard
                planName="Vitalício"
                price={PRICING.vitalicio}
                currencySymbol="R$"
                unitLabel="pagamento único"
                description={
                  pricingIntentCopy?.vitalicioDescription ??
                  "Funcionalidades completas da plataforma"
                }
                features={vitalicioFeatures}
                buttonText={vitalicioButtonConfig.text}
                buttonVariant={vitalicioButtonConfig.variant}
                buttonClassName={vitalicioButtonConfig.className}
                onButtonClick={vitalicioButtonConfig.onClick}
                isButtonDisabled={vitalicioButtonConfig.disabled}
                isButtonLoading={vitalicioButtonConfig.loading}
                customClassName="order-2 border-[#CFCEFC] bg-[#F5F5FF] dark:bg-[#282841] dark:border-[#484777] md:order-none"
                badgeText="RECOMENDADO"
                featureHeader={PLAN_HEADERS.vitalicio}
                footerNote="Pague uma vez e use para sempre."
              />
            </div>

            <p className="text-muted-foreground mx-auto mt-8 max-w-[88rem] text-center text-xs">
              Saiba como tratamos seus dados na nossa{" "}
              <a
                href="/trust"
                target="_blank"
                rel="noreferrer"
                className="text-foreground underline underline-offset-2"
              >
                página de Segurança e Confiança
              </a>
              .
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PricingDialog;
