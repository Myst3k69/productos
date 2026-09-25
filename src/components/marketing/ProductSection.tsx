import { HandArrow, HandNote } from "./HandNote";
import { ProductPreview } from "./ProductPreview";
import { RV, d } from "./reveal";

/** Aperçu produit : la vraie promesse, montrée dans une fausse fenêtre vivante. */
export function ProductSection() {
  return (
    <section id="produit" aria-label="Aperçu du produit" className="relative mx-auto max-w-[1320px] scroll-mt-20 px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <p data-reveal className={`${RV} max-w-md text-[15px] text-ink-2`}>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">Aperçu produit — </span>
          Un tableau où vos tâches avancent seules, un assistant qui cadre avec vous, des agents qui codent.
        </p>
        <div data-reveal style={d(1)} className={`${RV} hidden items-end gap-1 md:flex`}>
          <HandNote rotate={-5} className="text-[15px]">
            Ça bouge tout seul.
            <br />
            Vous validez.
          </HandNote>
          <HandArrow dir="down-right" className="mb-[-22px] h-10 w-10" />
        </div>
      </div>
      <div data-reveal style={d(1)} className={RV}>
        <ProductPreview />
      </div>
    </section>
  );
}
