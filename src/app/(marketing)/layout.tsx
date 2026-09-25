import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "BuildOS — De l'idée à la production" },
  description:
    "Le système d'exploitation des entrepreneurs pour créer et faire évoluer des applications avec l'IA. Vous décrivez, l'IA structure, on construit ensemble — avec le Build Club.",
};

/** Mise en page de la landing : défilement normal du document (pas de coquille d'application). */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="relative min-h-full">{children}</div>;
}
