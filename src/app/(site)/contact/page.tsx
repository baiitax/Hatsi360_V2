import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND, CONTACT } from '@/lib/brand';
import { PageHero } from '@/components/ui/PageHero';
import { getPageImage } from '@/lib/images/registry';
import { ContactForm } from '@/components/forms/ContactForm';
import { CopyValue } from '@/components/forms/CopyValue';
import { IconArrowRight, IconPin } from '@/components/ui/icons';

export const metadata: Metadata = {
  title: 'Contact | Hatsi360 Markets',
  description:
    'Talk to the Hatsi360 team about market partnerships, API access, custom reports or a published price you think looks wrong.',
  alternates: { canonical: '/contact' },
  openGraph: {
    type: 'website',
    siteName: 'Hatsi360 Markets',
    locale: BRAND.locale,
    title: 'Contact | Hatsi360 Markets',
    description: 'Contact the Hatsi360 Markets team.',
    url: '/contact',
    images: [{ url: '/brand/hatsi360-social-1200x630.png', width: 1200, height: 630, type: 'image/png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact | Hatsi360 Markets',
    description: 'Contact the Hatsi360 Markets team.',
    images: ['/brand/hatsi360-social-1200x630.png'],
  },
};

/**
 * The contact page.
 *
 * It is part of the terminal, not a paper form beside it: the same dark canvas,
 * the same panel, the same type. The page answers three questions in order —
 * who you are writing to, what the fastest route to an answer is, and what
 * happens after you press send — and the aside carries the details a reader
 * copies into an email rather than retypes.
 */

const FAQS = [
  {
    question: 'How quickly will I hear back?',
    answer:
      'Within one business day for everything that arrives through this form. A price correction that needs the verification trail takes longer to answer properly, and we say so in the first reply rather than after a week.',
  },
  {
    question: 'Can you add a market I trade in?',
    answer:
      'Usually, yes. Coverage grows from the routes our agents already walk. Tell us the market, the trading days and the commodities, and the coverage team will tell you what the first observation would require.',
  },
  {
    question: 'I signed up but have not been given a workspace.',
    answer:
      'Agent and staff accounts are created in the control centre rather than by self-service. Choose “Something else”, include the email address you signed up with, and the team will route it.',
  },
  {
    question: 'Is the price on the site actually the price paid?',
    answer:
      'Every figure is a recorded observation with a market, a unit, a collection time and a verification state. Where a price is a wholesale transaction, it says so. Where two observations are not comparable, the platform shows no movement rather than estimating one.',
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Talk to the Hatsi360 team"
        lede="Whether you want to bring a market into the collection network, need API access, want a custom report, or believe a published price is wrong — we want to hear it."
        breadcrumbs={[{ label: 'Contact' }]}
        image={getPageImage('contact.hero')}
      />

      {/* ------------------------------------------------------ the routes */}
      <div className="border-b border-terminal-border">
        <div className="container-page grid gap-px bg-terminal-border sm:grid-cols-3">
          {[
            {
              label: 'Telephone',
              value: CONTACT.phone,
              href: CONTACT.phoneHref,
              detail: 'Weekdays, 09:00–17:00 West Africa Time.',
            },
            {
              label: 'Email',
              value: CONTACT.email,
              href: CONTACT.emailHref,
              detail: 'Anything with an attachment or a document.',
            },
            {
              label: 'Office',
              value: `${CONTACT.address.line1}, ${CONTACT.address.city}`,
              href: CONTACT.mapHref,
              detail: 'By appointment, for partners and collection agents.',
              wrap: true,
            },
          ].map((route) => (
            <div key={route.label} className="bg-terminal-bg px-4 py-4 sm:px-5">
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-terminal-text-muted">
                {route.label}
              </p>
              <div className="mt-1.5">
                <CopyValue
                  value={route.value}
                  label={route.label}
                  href={route.href}
                  wrap={'wrap' in route ? route.wrap : false}
                />
              </div>
              <p className="mt-1.5 text-[0.6875rem] leading-snug text-terminal-text-muted">
                {route.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="container-page grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <ContactForm />

          <aside className="space-y-4 lg:sticky lg:top-24">
            {/* The address, with a door out to a map. */}
            <section className="terminal-panel p-4" aria-labelledby="office-heading">
              <h2
                id="office-heading"
                className="flex items-center gap-1.5 font-display text-[0.8125rem] font-bold text-terminal-text"
              >
                <IconPin className="size-3.5 text-harvest-400" />
                Where we are
              </h2>
              <address className="mt-2 text-[0.8125rem] not-italic leading-relaxed text-terminal-text-secondary">
                {CONTACT.address.line1}
                <br />
                {CONTACT.address.city}, {CONTACT.address.country}
              </address>
              <a
                href={CONTACT.mapHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold text-harvest-400 underline decoration-harvest-500/40 underline-offset-4 hover:decoration-harvest-400"
              >
                Open in maps
                <IconArrowRight className="size-3" />
              </a>
            </section>

            <section className="terminal-panel p-4" aria-labelledby="next-heading">
              <h2 id="next-heading" className="font-display text-[0.8125rem] font-bold text-terminal-text">
                What happens next
              </h2>
              <ol className="mt-2.5 space-y-2.5">
                {[
                  'Logged against the topic you choose.',
                  'Routed to the person who owns it.',
                  'Answered within one business day.',
                ].map((step, index) => (
                  <li key={step} className="flex gap-2.5 text-[0.8125rem] text-terminal-text-secondary">
                    <span className="figure-num mt-px grid size-5 shrink-0 place-items-center rounded-full border border-terminal-border text-[0.625rem] font-semibold text-terminal-text-muted">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </section>

            <section className="terminal-panel p-4" aria-labelledby="shortcuts-heading">
              <h2 id="shortcuts-heading" className="font-display text-[0.8125rem] font-bold text-terminal-text">
                Before you write
              </h2>
              <ul className="mt-2.5 space-y-2">
                {[
                  { href: '/pricing', label: 'Plans and entitlements' },
                  { href: '/api-docs', label: 'API reference' },
                  { href: '/methodology', label: 'How prices are verified' },
                  { href: '/coverage', label: 'Markets already covered' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group flex items-center justify-between gap-2 text-[0.8125rem] text-terminal-text-secondary transition-colors hover:text-terminal-text"
                    >
                      {link.label}
                      <IconArrowRight className="size-3 shrink-0 text-terminal-text-muted transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>

      {/* --------------------------------------------------------- the FAQs */}
      <div className="border-t border-terminal-border">
        <div className="container-page py-10">
          <h2 className="font-display text-lg font-bold text-terminal-text">Questions we are asked</h2>
          <div className="mt-4 grid gap-2 lg:grid-cols-2">
            {FAQS.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-[0.625rem] border border-terminal-border bg-terminal-surface/60 px-4 py-3 open:border-harvest-500/40"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[0.8125rem] font-semibold text-terminal-text [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <span
                    aria-hidden="true"
                    className="grid size-5 shrink-0 place-items-center rounded-full border border-terminal-border text-terminal-text-muted transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-terminal-text-secondary">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
