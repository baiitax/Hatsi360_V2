const ambientCredentialNames = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_DB_HOST',
  'SUPABASE_DB_PORT',
  'SUPABASE_DB_NAME',
  'SUPABASE_DB_USER',
  'SUPABASE_DB_PASSWORD',
  'DATABASE_URL',
  'POSTGRES_URL',
];

const ambientCredentials = ambientCredentialNames.filter((name) => Boolean(process.env[name]));
if (ambientCredentials.length) {
  throw new Error(
    `Vitest refused ambient application credentials (${ambientCredentials.join(', ')}). ` +
      'Remove them from the shell; Vitest never loads .env.local. Use HATSI_TEST_* variables only for a local loopback test service.',
  );
}

function isLoopback(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname.toLowerCase());
}

function loopbackUrl(value: string | undefined, label: string): string | undefined {
  if (!value) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid loopback URL.`);
  }
  if (!isLoopback(parsed.hostname)) {
    throw new Error(`${label} must point to localhost, 127.0.0.1, or ::1; remote test services are blocked.`);
  }
  return value;
}

const testSupabaseUrl = loopbackUrl(process.env.HATSI_TEST_SUPABASE_URL, 'HATSI_TEST_SUPABASE_URL');
const testDbHost = process.env.HATSI_TEST_DB_HOST;
if (testDbHost && !isLoopback(testDbHost)) {
  throw new Error('HATSI_TEST_DB_HOST must be localhost, 127.0.0.1, or ::1; remote test databases are blocked.');
}

const publicKey =
  process.env.HATSI_TEST_SUPABASE_PUBLISHABLE_KEY ??
  process.env.HATSI_TEST_SUPABASE_ANON_KEY ??
  '';
if (Boolean(testSupabaseUrl) !== Boolean(publicKey)) {
  throw new Error('HATSI_TEST_SUPABASE_URL and HATSI_TEST_SUPABASE_PUBLISHABLE_KEY must be provided together.');
}

const dbFields = [
  process.env.HATSI_TEST_DB_HOST,
  process.env.HATSI_TEST_DB_NAME,
  process.env.HATSI_TEST_DB_USER,
  process.env.HATSI_TEST_DB_PASSWORD,
];
if (dbFields.some(Boolean) && !dbFields.every(Boolean)) {
  throw new Error('Local DB tests require HATSI_TEST_DB_HOST, HATSI_TEST_DB_NAME, HATSI_TEST_DB_USER, and HATSI_TEST_DB_PASSWORD together.');
}

// Map only explicitly named local-test credentials into the legacy variables
// used by the integration tests. With no HATSI_TEST_* values, DB/auth tests
// see empty config and take their existing skip paths.
process.env.SUPABASE_DB_HOST = testDbHost ?? '';
process.env.SUPABASE_DB_PORT = process.env.HATSI_TEST_DB_PORT ?? '5432';
process.env.SUPABASE_DB_NAME = process.env.HATSI_TEST_DB_NAME ?? '';
process.env.SUPABASE_DB_USER = process.env.HATSI_TEST_DB_USER ?? '';
process.env.SUPABASE_DB_PASSWORD = process.env.HATSI_TEST_DB_PASSWORD ?? '';
process.env.NEXT_PUBLIC_SUPABASE_URL = testSupabaseUrl ?? '';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = publicKey;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.HATSI_TEST_SUPABASE_ANON_KEY ?? publicKey;
process.env.SUPABASE_SERVICE_ROLE_KEY = '';
process.env.HATSI_ORIGIN = '';

// Network calls from tests are loopback-only even when application code or a
// test accidentally constructs a URL. PostgreSQL tests are separately bounded
// to loopback by the database host validation above.
const nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const raw = typeof input === 'string' || input instanceof URL ? input : input.url;
  const url = new URL(raw);
  if (!isLoopback(url.hostname)) {
    throw new Error(`Vitest network isolation blocked ${url.protocol}//${url.hostname}.`);
  }
  return nativeFetch(input, init);
};
