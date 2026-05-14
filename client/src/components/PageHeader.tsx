import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-2">
      <div className="heading-rule">
        {eyebrow && (
          <p className="text-[0.7rem] font-medium tracking-[0.18em] uppercase text-primary/80 mb-1.5" data-testid="text-eyebrow">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-3xl sm:text-4xl text-foreground" data-testid="text-page-title">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
