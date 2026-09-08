import type { Metadata } from "next";
import CalculadoraFIIClient from "./CalculadoraFIIClient";

export const metadata: Metadata = {
  title: "Calculadora Completa de FIIs — Portfólio + Projeção",
  description:
    "Calcule seu portfólio atual de FIIs e projete o patrimônio futuro com aportes mensais, dividendos reinvestidos e valorização da cota.",
};

export default function Page() {
  return <CalculadoraFIIClient />;
}
