import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const adminDirectory = join(process.cwd(), 'src', 'app', 'admin');

function pageFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return pageFiles(path);
    return entry.name === 'page.tsx' ? [path] : [];
  });
}

describe('administrator route authorization', () => {
  const pages = pageFiles(adminDirectory).filter((file) => file !== join(adminDirectory, 'page.tsx'));

  it.each(pages.map((file) => [relative(adminDirectory, file), file]))(
    'checks role-specific path access before rendering %s',
    (_route, file) => {
      const source = readFileSync(file as string, 'utf8');
      // requireAdmin is intentionally stricter than the central per-path rule;
      // every other staff route must check its exact path against ROLE_PATHS.
      expect(source).toMatch(/await\s+(?:requirePathAccess|requireAdmin)\s*\(/);
    },
  );
});
