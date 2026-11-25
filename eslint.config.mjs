import next from 'eslint-config-next';
<<<<<<< HEAD

/**
 * The lint configuration.
=======
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

/**
 * The Hatsi360 lint configuration.
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
 *
 * `next lint` was removed in Next 16, and ESLint itself was never a dependency
 * of this project — so `npm run lint` failed before it could report anything.
 * This flat config restores the gate using the Next.js ruleset directly, which
<<<<<<< HEAD
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
=======
 * Next 16 ships as a flat config, and adds the TypeScript plugin explicitly
 * so the project's TypeScript-specific rules resolve correctly.
 *
 * Test files are excluded from the Next.js `no-assign-module-variable` rule
 * because test loops commonly use `module` as an iteration variable (it is
 * a meaningful word in the domain of the Hatsi360 terminal navigation tests).
 */
export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'playwright-report/**', 'supabase/**'],
  },
  ...next,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
<<<<<<< HEAD
=======
  {
    // Test files use `module` as an iteration variable over MARKET_NAV entries.
    // This is a meaningful domain word, not a CommonJS override.
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@next/next/no-assign-module-variable': 'off',
    },
  },
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
];
