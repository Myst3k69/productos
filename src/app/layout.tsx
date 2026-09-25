import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Permanent_Marker, Schibsted_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-schibsted",
  display: "swap",
  weight: ["500", "600", "700", "800", "900"],
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const marker = Permanent_Marker({
  subsets: ["latin"],
  variable: "--font-marker",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  title: { default: "BuildOS — De l'idée à la production", template: "%s · BuildOS" },
  description:
    "Le système d'exploitation des entrepreneurs pour créer et faire évoluer des applications avec l'IA. Vous décrivez, l'IA structure, on construit ensemble.",
  applicationName: "BuildOS",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f4f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0e" },
  ],
  width: "device-width",
  initialScale: 1,
};

/* Applique le thème avant le premier rendu pour éviter le flash. */
const themeScript = `(function(){try{var t=localStorage.getItem('atelier.theme');var d=t==='dark';if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${schibsted.variable} ${geist.variable} ${geistMono.variable} ${marker.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <div id="app-root">{children}</div>
        <Toaster
          position="bottom-right"
          offset={20}
          toastOptions={{
            classNames: {
              toast: "!bg-card !text-ink !border !border-line-2 !shadow-pop !rounded-xl !font-sans",
              title: "!font-semibold",
              description: "!text-ink-2",
              actionButton: "!bg-accent !text-white !rounded-md !font-semibold",
            },
          }}
        />
      </body>
    </html>
  );
}
