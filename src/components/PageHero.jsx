const PageHero = ({ image, eyebrow, title, subtitle, actions, chips, side, className = '' }) => (
  <section className={`relative mb-10 rounded-[2.25rem] p-7 shadow-premium md:p-10 ${className}`}>
    <div className="absolute inset-0 overflow-hidden rounded-[2.25rem]">
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />
    </div>
    <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <p className="mb-3 text-xs font-bold uppercase tracking-[0.32em] text-white/80">{eyebrow}</p>}
        {title && (
          <h1 className="mb-3 font-serif text-3xl font-normal leading-tight text-white drop-shadow lg:text-5xl">
            {title}
          </h1>
        )}
        {subtitle && <p className="max-w-2xl text-base leading-relaxed text-white/90 drop-shadow lg:text-lg">{subtitle}</p>}
        {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
        {chips && <div className="mt-5 flex flex-wrap gap-2 text-xs">{chips}</div>}
      </div>
      {side && <div className="flex items-start">{side}</div>}
    </div>
  </section>
);

export const heroPrimaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-brand-stone-900 transition hover:-translate-y-0.5';
export const heroSecondaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20';
export const heroChipClass = 'rounded-full bg-white/15 px-3 py-1 font-semibold text-white backdrop-blur';

export default PageHero;
