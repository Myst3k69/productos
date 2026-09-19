/**
 * Le back-office réel (base SQLite, exécuteur, Claude Agent SDK) est conservé dans le dépôt
 * mais désactivé par défaut : le prototype fonctionne avec des données simulées côté client.
 * Activez-le avec ATELIER_BACKEND=1 (et NEXT_PUBLIC_ATELIER_MODE=api côté client).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.ATELIER_BACKEND === "1") {
    const { bootRunner } = await import("@/lib/server/runner");
    await bootRunner();
  }
}
