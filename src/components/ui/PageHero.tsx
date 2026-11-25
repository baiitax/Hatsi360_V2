import type { ReactNode } from 'react';
import { Breadcrumbs } from './index';
import { BreadcrumbJsonLd } from '@/components/marketing/StructuredData';
import { HatsiImage, type ImageRatio } from '@/components/media/HatsiImage';
import type { ImageAsset } from '@/lib/images/registry';

/**
 * A page header used across the public site.
 *
 * Keeps the eyebrow / title / lede rhythm consistent on every page, and
 * carries the breadcrumb trail where one exists.
 *
 * The hero is part of the market terminal, so by default it is toned to the
 * terminal environment: the page reads as one surface from the freshness strip
 * down. A page that is deliberately a light document can ask for
 * `tone="editorial"` and gets the paper band instead. Mixing the two by
 * accident is what produced pages that opened as a white sheet on a dark
 * terminal and then turned dark again halfway down.
 *
 * A page may also give it a photograph. The photograph never displaces the
 * heading — the text stays in the leading column and the image supports it —
 * and it is resolved through the image registry rather than by a URL, so a
 * page asks for `"about.hero"` and never carries a path.
 */
export function PageHero({
  eyebrow,
  title,
  lede,
  breadcrumbs,
  image,
  imageRatio = 'landscape',
  tone = 'terminal',
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: ReactNode;
  breadcrumbs?: { href?: string; label: string }[];
  /** The photograph that supports the heading. */
  image?: ImageAsset;
  /** The ratio of the photograph. */
  imageRatio?: ImageRatio;
  /** Which environment the band belongs to. The terminal is the default. */
  tone?: 'terminal' | 'editorial';
  children?: ReactNode;
}) {
  return (
    <section
      className={
        tone === 'terminal'
          ? 'hero-terminal border-b border-terminal-border bg-terminal-bg'
          : 'editorial border-b border-ink-200 bg-white'
      }
    >
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <BreadcrumbJsonLd
          items={breadcrumbs.map((crumb) => ({
            name: crumb.label,
            // The last crumb is the current page and has no href; the
            // structured-data form omits its URL, as schema.org expects.
            url: crumb.href,
          }))}
        />
      ) : null}

      <div className="container-page py-10 sm:py-14">
        {breadcrumbs ? <Breadcrumbs items={breadcrumbs} tone={tone} /> : null}
        <div
          className={
            image
              ? 'grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center lg:gap-12'
              : undefined
          }
        >
          <div className="max-w-3xl">
            {eyebrow ? (
              <p
                className={
                  tone === 'terminal'
                    ? 'text-sm font-semibold uppercase tracking-widest text-terminal-accent'
                    : 'text-sm font-semibold uppercase tracking-widest text-brand-700'
                }
              >
                {eyebrow}
              </p>
            ) : null}
            <h1
              className={`mt-2 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl ${
                tone === 'terminal' ? 'text-terminal-text' : ''
              }`}
            >
              {title}
            </h1>
            {lede ? (
              <div
                className={
                  tone === 'terminal'
                    ? 'mt-4 text-base leading-relaxed text-terminal-text-secondary sm:text-lg'
                    : 'mt-4 text-base leading-relaxed text-ink-600 sm:text-lg'
                }
              >
                {lede}
              </div>
            ) : null}
            {children ? <div className="mt-6">{children}</div> : null}
          </div>

          {image ? (
            <HatsiImage
              asset={image}
              sizes="(min-width: 1024px) 30rem, 92vw"
              ratio={imageRatio}
              className="rounded-2xl"
              priority
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
