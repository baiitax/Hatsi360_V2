import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { resolveRoute } from '@/lib/route-map';

const sourceRoots = [join(process.cwd(), 'src', 'app'), join(process.cwd(), 'src', 'components')];

type RouteSegment = string | '*';

function filesUnder(directory: string, output: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) filesUnder(path, output);
    else if (/\.(tsx|ts)$/.test(entry.name)) output.push(path);
  }
  return output;
}

function routePatterns(): string[][] {
  const appDirectory = join(process.cwd(), 'src', 'app');
  return filesUnder(appDirectory)
    .filter((file) => file.endsWith('page.tsx'))
    .map((file) => {
      const routeDirectory = file.slice(appDirectory.length).replace(/\/page\.tsx$/, '');
      const segments = routeDirectory.split('/').filter(Boolean).filter((segment) => {
        return !(segment.startsWith('(') && segment.endsWith(')')) && !segment.startsWith('@');
      });
      return segments.map((segment): RouteSegment =>
        segment.startsWith('[') && segment.endsWith(']') ? '*' : segment,
      );
    });
}

function routeExists(path: string, routes: string[][]): boolean {
  const canonical = resolveRoute(path.split(/[?#]/, 1)[0] || '/');
  const segments = canonical.split('/').filter(Boolean);
  return routes.some(
    (route) =>
      route.length === segments.length &&
      route.every((segment, index) => segment === '*' || segment === segments[index]),
  );
}

describe('static internal links', () => {
  it('points literal in-app hrefs to a page or a declared route alias', () => {
    const routes = routePatterns();
    const broken: string[] = [];
    const expression = /\bhref\s*(?:=|:)\s*['"](\/[^'"{}$`\s]*)['"]/g;

    for (const file of sourceRoots.flatMap((root) => filesUnder(root))) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(expression)) {
        const href = match[1];
        if (href.startsWith('/api/') || href.startsWith('/_next/')) continue;
        if (!routeExists(href, routes)) broken.push(`${file}: ${href}`);
      }
    }

    expect(broken, `Broken internal links:\n${broken.join('\n')}`).toEqual([]);
  });
});
