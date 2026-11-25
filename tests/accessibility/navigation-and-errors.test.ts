import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('keyboard-accessible navigation disclosures', () => {
  it('uses the supplied logo lockup in the terminal header', () => {
    const header = source('src/components/terminal/TerminalShell.tsx');
    // The whole supplied lockup — mark, wordmark, category line and the
    // endorsement — reversed for the deep-green rail. Not a recomposed
    // stand-in, and not at a height invented in the header.
    expect(header).toMatch(/<BrandLockup/);
    expect(header).toMatch(/tone="dark"/);
    expect(header).not.toMatch(/<BrandLockup[^>]*height=\{\d+\}/);
    expect(header).not.toContain('<BrandMark size={26} tone="dark" />');
    expect(header).toContain('focus-visible:outline-offset-2');
  });

  it('publishes the office address in the header, from the same record as the footer', () => {
    const header = source('src/components/terminal/TerminalShell.tsx');
    expect(header).toContain('CONTACT.address.line1');
    expect(header).toContain('CONTACT.mapHref');
  });

  it('uses native disclosure controls for public and terminal desktop menus', () => {
    const publicNavigation = source('src/components/site/navigation.tsx');
    const terminalNavigation = source('src/components/terminal/TerminalShell.tsx');

    expect(publicNavigation).toContain('<details className="relative">');
    expect(publicNavigation).toContain('<summary className=');
    expect(terminalNavigation).toContain('<details className="relative">');
    expect(terminalNavigation).toContain('<summary className=');
  });

  it('labels modal drawers, exposes their state, and supports Escape/focus containment', () => {
    for (const file of [
      'src/components/admin/AdminShell.tsx',
      'src/components/terminal/MobileNavigation.tsx',
    ]) {
      const component = source(file);
      expect(component).toContain('role="dialog"');
      expect(component).toContain('aria-modal="true"');
      expect(component).toContain('aria-expanded={');
      expect(component).toContain("event.key === 'Escape'");
      expect(component).toContain("event.key !== 'Tab'");
      expect(component).toContain('trigger?.focus()');
    }
  });
});

describe('error recovery boundaries', () => {
  it('provides an accessible last-resort retry if the root layout fails', () => {
    const globalError = source('src/app/global-error.tsx');
    expect(globalError).toContain('role="alert"');
    expect(globalError).toContain('onClick={reset}');
    expect(globalError).toContain('Try again');
    expect(globalError).toContain('<html lang="en">');
  });

  it('keeps retry and not-found exits available in route boundaries', () => {
    const error = source('src/app/error.tsx');
    const notFound = source('src/app/not-found.tsx');
    expect(error).toContain('onClick={reset}');
    expect(error).toContain('Try again');
    expect(notFound).toContain('Browse prices');
    expect(notFound).toContain('Back to the homepage');
  });

  it('closes curated content slug sets so unknown archive slugs return a not-found response', () => {
    expect(source('src/app/(site)/insights/[slug]/page.tsx')).toContain('export const dynamicParams = false;');
    expect(source('src/app/(site)/reports/[slug]/page.tsx')).toContain('export const dynamicParams = false;');
  });
});
