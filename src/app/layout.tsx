import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
  axes: ["opsz", "wdth"],
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
  axes: ["wdth"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Atelier", template: "%s · Atelier" },
  description: "Vous décrivez. L'IA fabrique. Vous validez. Le tableau de bord des fondateurs qui livrent.",
  applicationName: "Atelier",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f0e6" },
    { media: "(prefers-color-scheme: dark)", color: "#15130f" },
  ],
  width: "device-width",
  initialScale: 1,
};

/* Applique le thème avant le premier rendu pour éviter le flash. */
const themeScript = `(function(){try{var t=localStorage.getItem('atelier.theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${bricolage.variable} ${instrument.variable} ${jetbrains.variable}`} suppressHydrationWarning>
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
