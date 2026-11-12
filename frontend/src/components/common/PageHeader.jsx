export default function PageHeader({ eyebrow, title, titleAccent, subtitle }) {
  return (
    <div className="px-[4%] md:px-[2%] pt-32 md:pt-44 pb-12 md:pb-20">
      <div className="max-w-[1400px] mx-auto">
        {eyebrow && (
          <p className="font-body text-xs tracking-label uppercase text-muted-foreground mb-4">{eyebrow}</p>
        )}
        <h1 className="font-display text-display-xl font-light text-foreground">
          {title} {titleAccent && <span className="italic text-accent">{titleAccent}</span>}
        </h1>
        {subtitle && (
          <p className="font-body text-sm md:text-base text-muted-foreground max-w-2xl mt-6 leading-relaxed">
            {subtitle}
          </p>
        )}
        <div className="hairline mt-12" />
      </div>
    </div>
  );
}
