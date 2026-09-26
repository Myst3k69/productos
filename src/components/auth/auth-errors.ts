/** Traduit les erreurs de Supabase Auth en messages clairs, en français. */
export function authErrorMessage(err: unknown): string {
  const e = err as { message?: string; code?: string; status?: number } | null;
  const msg = e?.message ?? String(err ?? "");
  const code = e?.code ?? "";
  if (code === "invalid_credentials" || /invalid login credentials/i.test(msg)) return "E-mail ou mot de passe incorrect.";
  if (code === "email_not_confirmed" || /email not confirmed/i.test(msg)) return "Confirmez d'abord votre adresse : un lien vous a été envoyé par e-mail.";
  if (code === "user_already_exists" || /already registered|already exists/i.test(msg)) return "Un compte existe déjà avec cette adresse. Connectez-vous.";
  if (code === "weak_password" || /password should|weak password/i.test(msg)) return "Mot de passe trop faible : 8 caractères minimum, avec lettres et chiffres.";
  if (code === "same_password") return "Choisissez un mot de passe différent de l'actuel.";
  if (code === "over_email_send_rate_limit" || /rate limit/i.test(msg)) return "Trop d'e-mails envoyés pour le moment. Réessayez dans quelques minutes.";
  if (code === "email_address_invalid" || /invalid email|email address.*invalid/i.test(msg)) return "Adresse e-mail invalide.";
  if (code === "user_banned") return "Ce compte est suspendu. Contactez l'équipe BuildOS.";
  if (code === "signup_disabled") return "Les inscriptions sont fermées pour le moment.";
  if (/Failed to fetch|NetworkError/i.test(msg)) return "Connexion au serveur impossible. Vérifiez votre réseau.";
  return msg || "Une erreur est survenue. Réessayez.";
}

export const PASSWORD_MIN = 8;

/** Contrôle local du mot de passe (le serveur applique aussi sa propre politique). */
export function passwordProblem(pwd: string): string | null {
  if (pwd.length < PASSWORD_MIN) return `${PASSWORD_MIN} caractères minimum.`;
  if (!/[a-zA-Z]/.test(pwd) || !/\d/.test(pwd)) return "Mélangez lettres et chiffres.";
  return null;
}
