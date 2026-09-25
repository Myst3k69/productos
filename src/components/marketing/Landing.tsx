import { AgentsMarquee } from "./AgentsMarquee";
import { AgentsSection } from "./AgentsSection";
import { AudienceSection } from "./AudienceSection";
import { AuditsSection } from "./AuditsSection";
import { BuildClubSection } from "./BuildClubSection";
import { DeliverablesSection } from "./DeliverablesSection";
import { Faq } from "./Faq";
import { FinalCta } from "./FinalCta";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingNav } from "./MarketingNav";
import { Pricing } from "./Pricing";
import { ProductSection } from "./ProductSection";
import { ReleaseSection } from "./ReleaseSection";
import { RevealObserver } from "./RevealObserver";
import { Testimonials } from "./Testimonials";
import { UseCases } from "./UseCases";
import { RV, d } from "./reveal";

/** Landing marketing BuildOS — publique, sans store. */
export function Landing() {
  return (
    <>
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
      >
        Aller au contenu
      </a>
      <MarketingNav />
      <main id="contenu" className="overflow-x-clip">
        <Hero />
        <ProductSection />
        <AgentsMarquee />
        <HowItWorks />
        <AgentsSection />
        <DeliverablesSection />

        <section aria-label="Contrôle et santé des applications" className="mx-auto max-w-[1320px] px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
          <div className="grid gap-4 xl:grid-cols-2">
            <div data-reveal className={RV}>
              <ReleaseSection />
            </div>
            <div data-reveal style={d(1)} className={RV}>
              <AuditsSection />
            </div>
          </div>
        </section>

        <AudienceSection />
        <UseCases />
        <BuildClubSection />
        <Testimonials />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <MarketingFooter />
      <RevealObserver />
    </>
  );
}
