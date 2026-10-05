/**
 * The masthead of every screen.
 *
 * `eyebrow` is the small caps line above the title — it places the page
 * inside the product ("Ledger", "Directory") so the title itself can stay a
 * single plain word. The gold rule under the title is the only ornament.
 */
export const PageHeader = ({ eyebrow, title, description, actions }) => (
  <div className="mb-8">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-1.5">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-tight md:text-[2.125rem]">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>

    <div className="rule-gold mt-5 w-full" />
  </div>
);
