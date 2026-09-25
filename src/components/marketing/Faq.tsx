import { Plus } from "lucide-react";
import { SectionHead } from "./SectionHead";
import { RV, d } from "./reveal";

const QA = [
  {
    q: "Que deviennent mes données et mes idées ?",
    a: "Elles restent à vous. Vos projets sont hébergés en Europe, chiffrés, et ne servent jamais à entraîner des modèles. Vous pouvez tout exporter ou tout supprimer à tout moment.",
  },
  {
    q: "Quel agent de code BuildOS utilise-t-il ?",
    a: "Celui qui convient le mieux à chaque tâche. BuildOS se connecte à Claude Code, Codex, Cursor, GitHub Copilot ou Devin, et route selon la nature de la tâche, la disponibilité et vos quotas. Vous pouvez imposer un agent quand vous le souhaitez.",
  },
  {
    q: "Je ne sais pas coder. Est-ce pour moi ?",
    a: "Oui. Vous décrivez ce que vous voulez en français ; l'IA pose les questions utiles, produit les livrables et pilote les agents. Vous validez des résultats concrets — des écrans, des parcours — pas du code.",
  },
  {
    q: "Qui possède le code produit ?",
    a: "Vous, intégralement. Le code est livré dans votre propre dépôt Git, sous votre compte. Pas de format propriétaire, pas de dépendance à BuildOS pour faire tourner votre application.",
  },
  {
    q: "Combien coûte l'IA en plus de l'abonnement ?",
    a: "Les tâches IA de votre formule sont incluses. Si vous connectez vos propres agents, leur coût estimé s'affiche avant chaque tâche, et vous fixez un plafond mensuel. Aucune mauvaise surprise en fin de mois.",
  },
  {
    q: "Puis-je quitter BuildOS et tout récupérer ?",
    a: "Oui : code, livrables (PRD, maquettes, modèle de données…), historique des décisions et tâches s'exportent en un clic, en Markdown, JSON et dépôt Git.",
  },
  {
    q: "Qu'est-ce que le Build Club ?",
    a: "La communauté qui accompagne BuildOS : ateliers hebdomadaires, labs thématiques, experts à la demande et des centaines de fondateurs qui livrent. L'accès est inclus dès la formule Builder.",
  },
  {
    q: "Comment BuildOS s'articule-t-il avec StartupWeek ?",
    a: "StartupWeek est le format intensif de 7 jours pour lancer votre MVP. BuildOS est l'outil utilisé du premier au dernier jour, et les participants gardent la formule Builder offerte pendant 3 mois.",
  },
];

/** FAQ en accordéon natif (<details>) : accessible, sans JavaScript. */
export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-[1320px] scroll-mt-20 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHead
            id="faq-title"
            label="Questions fréquentes"
            title={
              <>
                Vos questions,
                <br />
                nos réponses.
              </>
            }
            lead={
              <>
                Une autre question ? Posez-la au Build Club, un humain vous répond en moins de 24 h.
              </>
            }
          />
        </div>
        <ul className="border-t border-ink">
          {QA.map((item, i) => (
            <li key={item.q} data-reveal style={d(i % 4)} className={`${RV} border-b border-line-2`}>
              <details className="group" name="faq">
                <summary className="flex cursor-pointer list-none items-center gap-4 py-5 text-left [&::-webkit-details-marker]:hidden">
                  <span className="font-mono text-[11px] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex-1 font-display text-[18px] font-bold leading-snug tracking-[-0.025em] text-ink sm:text-[20px]">{item.q}</span>
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line-3 text-ink transition-all duration-300 group-open:rotate-45 group-open:border-accent group-open:bg-accent group-open:text-white">
                    <Plus className="h-4 w-4" aria-hidden />
                  </span>
                </summary>
                <p className="reveal-fast max-w-2xl pb-6 pl-8 pr-12 text-[15px] leading-relaxed text-ink-2 sm:pl-[38px]">{item.a}</p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
