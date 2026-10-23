import type { LucideIcon } from "lucide-react";
import { Container } from "./container";

/** Shared layout for the 404 and error pages. Plain markup so it works in server and client components. */
export function StatusScreen({
  icon: Icon,
  code,
  title,
  body,
  children,
}: {
  icon: LucideIcon;
  code?: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <Container>
      <section className="flex flex-col items-center gap-5 py-20 text-center md:py-28">
        <span className="flex size-16 items-center justify-center rounded-full bg-brand-soft text-brand" aria-hidden>
          <Icon className="size-8" />
        </span>
        {code && <p className="text-[11px] font-bold tracking-widest text-brand">{code}</p>}
        <h1 className="text-3xl font-bold leading-snug md:text-[36px]">{title}</h1>
        <p className="max-w-md text-[15px] text-muted">{body}</p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">{children}</div>
      </section>
    </Container>
  );
}

export const primaryAction =
  "flex min-h-12 items-center justify-center rounded-sm bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-strong";
export const secondaryAction =
  "flex min-h-12 items-center justify-center rounded-sm border border-border bg-white px-5 py-3 text-sm font-bold text-brand hover:bg-brand-soft";
