// Pages that haven't moved to the full-width Figma layout yet.
export default function NarrowLayout({ children }: LayoutProps<"/[lang]">) {
  return <div className="mx-auto w-full max-w-4xl px-4 py-8">{children}</div>;
}
