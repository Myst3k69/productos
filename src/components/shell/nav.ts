import type { LucideIcon } from "lucide-react";
import { Activity, Blocks, Bot, CalendarRange, Columns3, Gauge, LayoutGrid, LayoutList, Rocket, Settings, Users, Waves } from "lucide-react";

/** Compteur affiché à droite d'une entrée de navigation (calculé à partir des stores). */
export type NavCounter = "attention" | "deliverables" | "release" | "club";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Raccourci clavier affiché au survol */
  key?: string;
  counter?: NavCounter;
}

export interface NavGroup {
  id: string;
  /** Titre du groupe (absent pour l'entrée « Vue d'ensemble ») */
  label?: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  { id: "home", items: [{ href: "/home", label: "Vue d'ensemble", icon: LayoutGrid, key: "0" }] },
  {
    id: "project",
    label: "Projet",
    items: [
      { href: "/board", label: "Tableau", icon: Columns3, key: "1", counter: "attention" },
      { href: "/flow", label: "Flux", icon: Waves, key: "2" },
      { href: "/list", label: "Liste", icon: LayoutList, key: "3" },
      { href: "/week", label: "Semaine", icon: CalendarRange, key: "4" },
    ],
  },
  {
    id: "build",
    label: "Construire",
    items: [
      { href: "/deliverables", label: "Fondations", icon: Blocks, key: "G F", counter: "deliverables" },
      { href: "/agents", label: "Mes agents", icon: Bot, key: "G A" },
      { href: "/releases", label: "Mise en prod", icon: Rocket, key: "G M", counter: "release" },
    ],
  },
  {
    id: "pilot",
    label: "Piloter",
    items: [
      { href: "/dashboard", label: "Analytics", icon: Gauge, key: "5" },
      { href: "/audits", label: "Audits", icon: Activity, key: "G U" },
    ],
  },
  {
    id: "community",
    label: "Communauté",
    items: [{ href: "/club", label: "Build Club", icon: Users, key: "G C", counter: "club" }],
  },
];

export const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Réglages", icon: Settings, key: "G S" };

/** Vues de projet : recherche et filtres de tâches disponibles dans la barre du haut. */
export const PROJECT_VIEWS = ["/board", "/flow", "/list", "/week"];

export function isProjectView(pathname: string): boolean {
  return PROJECT_VIEWS.some((v) => pathname === v || pathname.startsWith(`${v}/`));
}

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const ROUTE_META: Record<string, { title: string; subtitle: string }> = {
  "/home": { title: "Vue d'ensemble", subtitle: "Ce qui a bougé, ce qui vous attend, ce qui arrive." },
  "/board": { title: "Tableau", subtitle: "Chaque colonne est une étape. L'IA avance, vous validez." },
  "/flow": { title: "Flux", subtitle: "Une ligne par tâche, de la spécification à la livraison." },
  "/list": { title: "Liste", subtitle: "Tout le projet, dense et triable." },
  "/week": { title: "Semaine", subtitle: "Les sept jours du sprint, jour par jour." },
  "/deliverables": { title: "Fondations", subtitle: "PRD, maquettes, modèle de données : la base de votre produit." },
  "/agents": { title: "Mes agents", subtitle: "Le bon agent de code, au bon moment." },
  "/releases": { title: "Mise en production", subtitle: "Dev, revue humaine, préprod, production." },
  "/dashboard": { title: "Analytics", subtitle: "Rythme de livraison, coûts, points d'attention." },
  "/audits": { title: "Audits & santé", subtitle: "Performance, sécurité, qualité : des recommandations concrètes." },
  "/club": { title: "Build Club", subtitle: "Ateliers, labs, experts et communauté de bâtisseurs." },
  "/settings": { title: "Réglages", subtitle: "Moteur IA, autonomie, intégrations." },
};

export function routeMeta(pathname: string): { title: string; subtitle: string } {
  const key = Object.keys(ROUTE_META).find((k) => isActivePath(pathname, k));
  return ROUTE_META[key ?? "/home"];
}
