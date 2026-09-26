const PLAN_LABEL: Record<string, string> = { free: "Gratuit", builder: "Builder", pro: "Pro", startupweek: "StartupWeek", team: "Équipe" };

/** Plans connus (réglables par un admin). */
export const PLANS = Object.keys(PLAN_LABEL);

/** Libellé d'un plan (« builder » → « Builder »). */
export function planLabel(plan: string | null | undefined): string {
  if (!plan) return "Builder";
  return PLAN_LABEL[plan] ?? plan.charAt(0).toUpperCase() + plan.slice(1);
}
