import next from 'eslint-config-next';

/**
 * The lint configuration.
 *
 * `next lint` was removed in Next 16, and ESLint itself was never a dependency
 * of this project — so `npm run lint` failed before it could report anything.
 * This flat config restores the gate using the Next.js ruleset directly, which
 * Next 16 ships as a flat config, and adds the TypeScript rules the project's
 * `.tsx` files depend on.
 */
export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'playwright-report/**'],
  },
  ...next,
  {
    // Scoped to TypeScript. The `@typescript-eslint` plugin is registered by
    // the Next.js config only for `.ts`/`.tsx` files, so a rule from that
    // plugin applied to every file made ESLint fail at configuration load the
    // moment a plain `.mjs` file appeared in the tree.
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];
