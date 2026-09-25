import type { Priority, TaskType } from "@/lib/domain/types";

export interface TopicTask {
  title: string;
  type: TaskType;
  priority: Priority;
  /** Objectif détaillé (ajouté à la spécification) */
  goal: string;
}

export interface Topic {
  id: string;
  match: RegExp;
  /** « le paiement en ligne » — pour les phrases de l'assistant */
  label: string;
  questions: string[];
  tasks: TopicTask[];
}

/**
 * Répertoire des besoins fréquents des fondateurs : questions de cadrage et découpage type.
 * L'ordre compte : le premier sujet qui correspond l'emporte.
 */
export const TOPICS: Topic[] = [
  {
    id: "app",
    match: /\b(cr[ée]er|construire|lancer|monter|faire)\b.{0,20}\b(une|un|mon|ma)\b.{0,12}\b(application|app|appli|plateforme|outil|saas|marketplace|place de march[ée]|site)\b/i,
    label: "votre application",
    questions: [
      "Qui sont vos utilisateurs principaux ?",
      "Quels sont les moyens de paiement souhaités, s'il y en a ?",
      "Voulez-vous une interface d'administration ?",
      "Avez-vous des contraintes techniques ou des outils existants ?",
    ],
    tasks: [
      { title: "Générer les fondations : PRD, parcours et modèle de données", type: "document", priority: "high", goal: "Poser une base claire avant de coder : vision, personas, parcours clés, schéma de données." },
      { title: "Maquetter les écrans clés", type: "design", priority: "medium", goal: "Wireframes HTML des 4 à 6 écrans du parcours principal." },
      { title: "Développer le parcours principal", type: "code", priority: "high", goal: "Le chemin qui apporte la valeur : de l'arrivée à l'action clé, testé de bout en bout." },
      { title: "Mettre en place comptes, paiement et administration", type: "code", priority: "medium", goal: "Inscription, connexion, paiement et un back-office minimal." },
    ],
  },
  {
    id: "payment",
    match: /paiement|payer|stripe|abonnement|factur|checkout|encaiss|tarif|prix/i,
    label: "le paiement en ligne",
    questions: [
      "Quels moyens de paiement voulez-vous accepter (carte, Apple Pay, virement) ?",
      "Paiement unique, abonnement, ou les deux ?",
      "Faut-il émettre des factures automatiquement ?",
      "Avez-vous déjà un compte Stripe ou un autre prestataire ?",
    ],
    tasks: [
      { title: "Modéliser les paiements et les factures", type: "data", priority: "high", goal: "Tables commandes, paiements, factures ; statuts et remboursements." },
      { title: "Intégrer le paiement Stripe (carte et Apple Pay)", type: "code", priority: "high", goal: "Checkout sécurisé, webhooks de confirmation, gestion des échecs." },
      { title: "Concevoir la page tarifs et le parcours d'achat", type: "design", priority: "medium", goal: "Trois formules lisibles, un parcours d'achat en deux étapes." },
      { title: "Rédiger les emails de confirmation de paiement", type: "marketing", priority: "low", goal: "Reçu, échec de paiement, renouvellement : ton de la marque." },
    ],
  },
  {
    id: "booking",
    match: /r[ée]serv|rendez-vous|cr[ée]neau|agenda|planning|calendrier|disponibilit/i,
    label: "la réservation",
    questions: [
      "Qu'est-ce qu'on réserve exactement (chambre, table, créneau, ressource) ?",
      "Faut-il un acompte ou un paiement à la réservation ?",
      "Comment gérer les annulations et les modifications ?",
      "Les disponibilités viennent-elles d'un outil existant (Google Agenda, logiciel métier) ?",
    ],
    tasks: [
      { title: "Modéliser les disponibilités et les réservations", type: "data", priority: "high", goal: "Ressources, créneaux, réservations, règles d'annulation." },
      { title: "Développer le parcours de réservation", type: "code", priority: "high", goal: "Choix de la date, du créneau, confirmation ; « Aujourd'hui » et « Demain » en un clic." },
      { title: "Envoyer confirmations et rappels automatiques", type: "code", priority: "medium", goal: "Email de confirmation, rappel la veille, lien d'annulation." },
    ],
  },
  {
    id: "admin",
    match: /admin|back-?office|mod[ée]rat|g[ée]rer les|gestion des/i,
    label: "un espace d'administration",
    questions: [
      "Qui doit y accéder, et avec quels rôles ?",
      "Quelles données faut-il pouvoir modifier en priorité ?",
      "Avez-vous besoin d'exports (CSV, Excel) ?",
      "Certaines actions sensibles doivent-elles être journalisées ?",
    ],
    tasks: [
      { title: "Définir les rôles et les permissions", type: "document", priority: "high", goal: "Matrice rôles × actions, validée avant le développement." },
      { title: "Construire l'espace d'administration", type: "code", priority: "high", goal: "Listes, fiches, recherche et actions groupées sur les données clés." },
      { title: "Ajouter l'export CSV et le journal des actions", type: "code", priority: "medium", goal: "Exports filtrés, historique des modifications sensibles." },
    ],
  },
  {
    id: "notifications",
    match: /e-?mail|mail|notif|rappel|sms|relance|newsletter/i,
    label: "les notifications",
    questions: [
      "Quels événements doivent déclencher un message ?",
      "Par quel canal : email, SMS, notification dans l'application ?",
      "Les utilisateurs doivent-ils pouvoir régler leurs préférences ?",
    ],
    tasks: [
      { title: "Cartographier les messages et leurs déclencheurs", type: "document", priority: "medium", goal: "Liste des événements, canal, contenu, fréquence maximale." },
      { title: "Mettre en place l'envoi d'emails transactionnels", type: "code", priority: "high", goal: "Service d'envoi, modèles, file d'attente et suivi des erreurs." },
      { title: "Rédiger les modèles de messages", type: "marketing", priority: "medium", goal: "Objets courts, ton de la marque, appel à l'action clair." },
    ],
  },
  {
    id: "auth",
    match: /connexion|compte|inscription|login|authentif|mot de passe|lien magique|sso/i,
    label: "les comptes utilisateurs",
    questions: [
      "Quelles méthodes de connexion : email et mot de passe, lien magique, Google ?",
      "Y a-t-il plusieurs types de comptes (client, partenaire, équipe) ?",
      "Faut-il valider l'email avant le premier accès ?",
    ],
    tasks: [
      { title: "Mettre en place l'inscription et la connexion", type: "code", priority: "high", goal: "Lien magique et Google, sessions sécurisées, limitation des tentatives." },
      { title: "Gérer les profils et les types de comptes", type: "code", priority: "medium", goal: "Page profil, rôles, suppression de compte (RGPD)." },
      { title: "Soigner les écrans d'accueil et d'erreur", type: "design", priority: "low", goal: "Messages clairs, états vides, récupération d'accès." },
    ],
  },
  {
    id: "dashboard",
    match: /statisti|dashboard|tableau de bord|reporting|kpi|m[ée]trique|indicateur/i,
    label: "le tableau de bord",
    questions: [
      "Pour qui est ce tableau de bord : vous, vos clients, votre équipe ?",
      "Quels sont les 3 chiffres qui comptent le plus ?",
      "À quelle fréquence les données doivent-elles être à jour ?",
    ],
    tasks: [
      { title: "Définir les indicateurs et leurs calculs", type: "data", priority: "high", goal: "Trois à cinq indicateurs, sources et formules écrites noir sur blanc." },
      { title: "Maquetter le tableau de bord", type: "design", priority: "medium", goal: "Tuiles, courbes, filtres par période." },
      { title: "Développer le tableau de bord", type: "code", priority: "high", goal: "Requêtes agrégées, cache, affichage responsive." },
    ],
  },
  {
    id: "search",
    match: /recherch|filtre|catalogue|annuaire|trier/i,
    label: "la recherche",
    questions: [
      "Que cherche-t-on : produits, lieux, personnes, documents ?",
      "Quels filtres sont indispensables ?",
      "Combien d'éléments au lancement, et dans six mois ?",
    ],
    tasks: [
      { title: "Indexer le catalogue pour la recherche", type: "code", priority: "high", goal: "Recherche plein texte tolérante aux fautes, résultats en moins de 200 ms." },
      { title: "Concevoir les filtres et la page de résultats", type: "design", priority: "medium", goal: "Filtres visibles, tri, état « aucun résultat » utile." },
      { title: "Développer la recherche et les filtres", type: "code", priority: "medium", goal: "Filtres combinables, URL partageable, pagination." },
    ],
  },
  {
    id: "landing",
    match: /landing|page d'accueil|site vitrine|seo|page de vente|lancement/i,
    label: "la page d'accueil",
    questions: [
      "À qui s'adresse la page, en une phrase ?",
      "Quelle action voulez-vous obtenir : inscription, démo, achat ?",
      "Avez-vous des preuves à montrer (clients, chiffres, avis) ?",
    ],
    tasks: [
      { title: "Écrire le message et la structure de la page", type: "marketing", priority: "high", goal: "Promesse, bénéfices, preuves, questions fréquentes, appel à l'action." },
      { title: "Maquetter la page d'accueil", type: "design", priority: "medium", goal: "Version bureau et mobile, identité de marque." },
      { title: "Intégrer la page et le suivi des conversions", type: "code", priority: "medium", goal: "Performance > 90, balises SEO, suivi des inscriptions." },
    ],
  },
  {
    id: "chat",
    match: /messag|chat|discussion|conversation|commentaire/i,
    label: "la messagerie",
    questions: [
      "Qui échange avec qui : clients entre eux, avec vous, avec des partenaires ?",
      "Faut-il des pièces jointes ?",
      "Les messages doivent-ils être modérés ?",
    ],
    tasks: [
      { title: "Modéliser les conversations et les messages", type: "data", priority: "high", goal: "Fils, participants, statuts lu/non lu." },
      { title: "Développer la messagerie en temps réel", type: "code", priority: "high", goal: "Envoi instantané, notifications, pièces jointes." },
      { title: "Mettre en place la modération", type: "ops", priority: "medium", goal: "Signalement, filtrage automatique, file de revue." },
    ],
  },
];

export const GENERIC_QUESTIONS = [
  "Qui va utiliser cette fonctionnalité en premier ?",
  "Quel est l'écran ou le parcours le plus important ?",
  "Qu'est-ce qui vous prouvera que c'est réussi ?",
  "Avez-vous des contraintes techniques ou des outils existants ?",
];

export function findTopic(text: string): Topic | null {
  return TOPICS.find((t) => t.match.test(text)) ?? null;
}

export function topicById(id: string | undefined): Topic | null {
  return TOPICS.find((t) => t.id === id) ?? null;
}

/** « Je veux ajouter un espace membre » → « un espace membre ». */
export function extractNeed(text: string): string {
  const cleaned = text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^(bonjour|salut|hello)[\s,!.]*/i, "")
    .replace(/^(je (veux|voudrais|souhaite|souhaiterais|aimerais)|j'aimerais|il (faut|faudrait)|on (doit|devrait|pourrait)|pouvez-vous|peux-tu|merci de)\s+/i, "")
    .replace(/^(ajouter|ajoute|cr[ée]er|cr[ée]e|construire|d[ée]velopper|d[ée]veloppe|faire|mettre en place|int[ée]grer|int[ée]gre|avoir)\s+/i, "")
    .replace(/[.!?]+$/, "");
  const short = cleaned.length > 70 ? `${cleaned.slice(0, 67).replace(/\s+\S*$/, "")}…` : cleaned;
  return short || "cette fonctionnalité";
}
