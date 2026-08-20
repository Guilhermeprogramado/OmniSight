import type React from "react";
import { Check } from "lucide-react";

/**
 * Centralized pricing configuration for all plans.
 *
 * Only two plans are sold:
 * - Mensal (R$180/month): 60% of the platform's functionality
 * - Vitalício (R$349, one-time): complete functionality
 *
 * The legacy `pro`/`pro-plus`/`ultra`/`team` keys are kept for the existing
 * billing internals (checkout, webhooks, analytics, TeamPricingDialog).
 */
export const PRICING = {
  mensal: 180,
  vitalicio: 349,
  pro: {
    monthly: 180,
    yearly: 180,
  },
  "pro-plus": {
    monthly: 60,
    yearly: 50,
  },
  ultra: {
    monthly: 349,
    yearly: 349,
  },
  team: {
    monthly: 40,
    yearly: 33,
  },
} as const;

export type PricingTier = keyof typeof PRICING;

export type PricingFeature = {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
};

export const PLAN_HEADERS = {
  free: null,
  pro: "Everything in Free, plus:",
  "pro-plus": "Everything in Pro, plus:",
  ultra: "Everything in Pro, plus:",
  team: "Everything in Pro, plus:",
  mensal: "60% das funcionalidades:",
  vitalicio: "Tudo do plano Mensal, mais:",
} as const;

export const freeFeatures: Array<PricingFeature> = [
  { icon: Check, text: "Access to basic AI model" },
  { icon: Check, text: "Limited responses" },
  { icon: Check, text: "Agent mode with local sandbox" },
];

export const proFeatures: Array<PricingFeature> = [
  { icon: Check, text: "Access to the best AI models for pentesting" },
  { icon: Check, text: "Extended limits" },
  { icon: Check, text: "File uploads" },
  { icon: Check, text: "Cloud agents" },
  { icon: Check, text: "Maximum context window" },
];

export const proPlusFeatures: Array<PricingFeature> = [
  { icon: Check, text: "3x more usage than Pro" },
];

export const ultraFeatures: Array<PricingFeature> = [
  { icon: Check, text: "10x more usage than Pro" },
  { icon: Check, text: "Priority access to new features" },
];

export const teamFeatures: Array<PricingFeature> = [
  { icon: Check, text: "2x more usage than Pro" },
  { icon: Check, text: "Centralized billing and invoicing" },
  { icon: Check, text: "Advanced team + seat management" },
];

export const mensalFeatures: Array<PricingFeature> = [
  { icon: Check, text: "Modelos de IA para pentest" },
  { icon: Check, text: "Agente ilimitado (cloud + sandbox local)" },
  { icon: Check, text: "Upload de arquivos" },
  { icon: Check, text: "Contexto estendido" },
];

export const vitalicioFeatures: Array<PricingFeature> = [
  { icon: Check, text: "Tudo do plano Mensal" },
  { icon: Check, text: "Acesso ao modelo mais potente" },
  { icon: Check, text: "Contexto máximo" },
  { icon: Check, text: "Prioridade em novas funcionalidades" },
  { icon: Check, text: "Pagamento único — acesso para sempre" },
];
