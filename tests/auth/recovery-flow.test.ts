import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const actions = readFileSync(join(root, 'src', 'lib', 'auth', 'actions.ts'), 'utf8');
const callback = readFileSync(join(root, 'src', 'app', 'auth', 'callback', 'route.ts'), 'utf8');
const resetPage = readFileSync(join(root, 'src', 'app', '(portal)', 'reset-password', 'page.tsx'), 'utf8');
const forms = readFileSync(join(root, 'src', 'components', 'forms', 'AuthForms.tsx'), 'utf8');

describe('password recovery route', () => {
  it('sends recovery emails through the code-exchange callback to the reset page', () => {
    expect(actions).toContain("new URL('/auth/callback', getSiteUrl())");
    expect(actions).toContain("callback.searchParams.set('next', '/reset-password')");
    expect(callback).toContain('exchangeCodeForSession(code)');
    expect(callback).toContain('safeRedirectPath(next, \'/dashboard\')');
  });

  it('renders a form wired to the server-side password update action', () => {
    expect(resetPage).toContain('<ResetPasswordForm />');
    expect(forms).toContain('export function ResetPasswordForm()');
    expect(forms).toContain('useActionState<AuthActionState, FormData>(\n    updatePassword,');
    expect(actions).toContain("supabase.auth.updateUser({ password: parsed.data.password })");
  });
});
