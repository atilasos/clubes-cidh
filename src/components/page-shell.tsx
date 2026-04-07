import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";

type Crumb = {
  label: string;
  href?: string;
};

type PageShellProps = {
  badge?: string;
  title: string;
  description: string;
  breadcrumbs?: Crumb[];
  children: ReactNode;
};

export function PageShell({ badge, title, description, breadcrumbs = [], children }: PageShellProps) {
  return (
    <main>
      <div className="container stack page-shell">
        {breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="row breadcrumbs">
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="row breadcrumb-item">
                {crumb.href ? <Link href={crumb.href as Route}>{crumb.label}</Link> : <span>{crumb.label}</span>}
                {index < breadcrumbs.length - 1 ? <span className="status">/</span> : null}
              </span>
            ))}
          </nav>
        ) : null}
        <section className="card stack hero-card">
          {badge ? <span className="badge">{badge}</span> : null}
          <div className="stack">
            <h1>{title}</h1>
            <p className="status hero-copy">{description}</p>
          </div>
        </section>
        {children}
      </div>
    </main>
  );
}

type InfoCardProps = {
  title: string;
  eyebrow?: string;
  children: ReactNode;
};

export function InfoCard({ title, eyebrow, children }: InfoCardProps) {
  return (
    <section className="card stack info-card">
      {eyebrow ? <span className="badge">{eyebrow}</span> : null}
      <h2>{title}</h2>
      {children}
    </section>
  );
}
