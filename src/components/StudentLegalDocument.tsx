import type { ReactNode } from 'react'

export function StudentLegalDocument({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
      <header className="border-b border-border pb-8">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8DCEF9]">Verbly Student App</p>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground"><strong className="text-foreground">Effective date:</strong> August 17, 2026</p>
      </header>
      <div className="mt-10 space-y-9 text-sm leading-7 text-foreground">{children}</div>
      <footer className="mt-12 border-t border-border pt-6 text-xs leading-6 text-muted-foreground">
        Verbly is operated by Verbly. For privacy or account questions, contact verblysupport@gmail.com.
      </footer>
    </article>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  )
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5">{children}</ul>
}
